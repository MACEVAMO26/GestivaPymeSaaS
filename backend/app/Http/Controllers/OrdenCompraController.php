<?php

namespace App\Http\Controllers;

use App\Models\OrdenCompra;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrdenCompraController extends Controller
{
    // Lista las ordenes de compra con sus detalles y proveedor
    public function index()
    {
        return OrdenCompra::with(['proveedor', 'detalles.producto'])->orderBy('created_at', 'desc')->get();
    }

    // Registra una nueva orden de compra con sus detalles
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'proveedor_id' => 'required|exists:proveedores,id',
            'usuario_id' => 'required|exists:users,id',
            'fecha_requerida' => 'required|date',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.precio_unitario' => 'required|numeric|min:0',
        ]);
        $orden = DB::transaction(function () use ($validatedData) {
            $ordenCompra = OrdenCompra::create([
                'proveedor_id' => $validatedData['proveedor_id'],
                'usuario_id' => $validatedData['usuario_id'],
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

            return $ordenCompra;
        });

        // Enviar notificación al proveedor
        $proveedor = \App\Models\Proveedor::find($validatedData['proveedor_id']);
        if ($proveedor && $proveedor->email) {
            try {
                \Illuminate\Support\Facades\Mail::to($proveedor->email)->send(new \App\Mail\OrdenCompraMail($orden, $proveedor));
            } catch (\Exception $e) {
                \Log::error('Error enviando email orden compra: ' . $e->getMessage());
            }
        }

        return response()->json($orden->load('detalles'), 201);
    }

    // Faltan otros metodos CRIU
}