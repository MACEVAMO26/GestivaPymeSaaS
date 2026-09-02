<?php

namespace App\Http\Controllers;

use App\Models\OrdenCompra;
use App\Models\CuentaPorPagar;
use App\Models\Proveedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrdenCompraController extends Controller
{
    // Lista las órdenes de compra con sus detalles y proveedor filtradas por empresa
    public function index()
    {
        $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);

        $ordenes = OrdenCompra::with(['proveedor', 'detalles.producto'])
            ->when($empresaId, function ($q) use ($empresaId) {
                $q->whereHas('proveedor', function ($pq) use ($empresaId) {
                    $pq->where('empresa_id', $empresaId);
                });
            })
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($ordenes);
    }

    // Registra una nueva orden de compra, sus detalles y genera la cuenta por pagar correspondiente
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'proveedor_id' => 'required|exists:proveedores,id',
            'usuario_id' => 'nullable|exists:usuarios,id',
            'fecha_requerida' => 'required|date',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.precio_unitario' => 'required|numeric|min:0',
        ]);

        $usuarioId = $validatedData['usuario_id'] ?? auth()->id() ?? 1;

        $orden = DB::transaction(function () use ($validatedData, $usuarioId) {
            $ordenCompra = OrdenCompra::create([
                'proveedor_id' => $validatedData['proveedor_id'],
                'usuario_id' => $usuarioId,
                'fecha_requerida' => $validatedData['fecha_requerida'],
                'estado' => 'pendiente',
                'total' => 0,
            ]);

            $totalOrden = 0;
            foreach ($validatedData['detalles'] as $detalle) {
                $subtotal = $detalle['cantidad'] * $detalle['precio_unitario'];
                $ordenCompra->detalles()->create([
                    'producto_id' => $detalle['producto_id'],
                    'cantidad' => $detalle['cantidad'],
                    'precio_unitario' => $detalle['precio_unitario'],
                    'subtotal' => $subtotal,
                ]);
                $totalOrden += $subtotal;
            }
            $ordenCompra->total = $totalOrden;
            $ordenCompra->save();

            // Generar automáticamente la cuenta por pagar vinculada a la compra
            $proveedor = Proveedor::find($ordenCompra->proveedor_id);
            CuentaPorPagar::create([
                'proveedor_id' => $ordenCompra->proveedor_id,
                'factura_numero' => 'FAC-OC-' . str_pad($ordenCompra->id, 4, '0', STR_PAD_LEFT),
                'concepto' => 'Orden de Compra OC-' . str_pad($ordenCompra->id, 4, '0', STR_PAD_LEFT) . ' - ' . ($proveedor?->razon_social ?? 'Suministros'),
                'total' => $totalOrden,
                'saldo_pendiente' => $totalOrden,
                'fecha_emision' => now()->toDateString(),
                'fecha_vencimiento' => now()->addDays(30)->toDateString(),
                'estado' => 'Pendiente',
            ]);

            return $ordenCompra;
        });

        // Enviar notificación al proveedor si tiene correo configurado
        $proveedor = Proveedor::find($validatedData['proveedor_id']);
        if ($proveedor && $proveedor->email && class_exists('\App\Mail\OrdenCompraMail')) {
            try {
                \Illuminate\Support\Facades\Mail::to($proveedor->email)->send(new \App\Mail\OrdenCompraMail($orden, $proveedor));
            } catch (\Exception $e) {
                \Log::error('Error enviando email orden compra: ' . $e->getMessage());
            }
        }

        return response()->json($orden->load(['detalles.producto', 'proveedor']), 201);
    }
}