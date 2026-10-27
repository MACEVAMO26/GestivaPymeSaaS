<?php

namespace App\Http\Controllers;

use App\Models\Recepcion;
use App\Models\RecepcionDetalle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // Permite manejar transacciones en la base de datos

class RecepcionController extends Controller
{
    // Bloque para listar las recepciones de mercancía con sus órdenes y proveedores
    public function index()
    {
        $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);

        $recepciones = Recepcion::with(['usuario', 'ordenCompra.proveedor', 'detalles.producto'])
            ->when($empresaId, function ($q) use ($empresaId) {
                $q->whereHas('ordenCompra.proveedor', function ($pq) use ($empresaId) {
                    $pq->where('empresa_id', $empresaId);
                });
            })
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($recepciones);
    }

    // Bloque para registrar recepción de mercancía y actualizar existencias
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'orden_compra_id' => 'required|integer|exists:ordenes_compra,id',
            'usuario_id' => 'nullable|integer|exists:usuarios,id',
            'fecha_recepcion' => 'nullable|date',
            'tipo_recepcion' => 'nullable|string',
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|integer|exists:productos,id',
            'detalles.*.cantidad_recibida' => 'required|integer|min:1',
            'detalles.*.estado_calidad' => 'nullable|in:Bueno,Malo,Regular',
        ]);

        $usuarioId = $validatedData['usuario_id'] ?? auth()->id() ?? 1;

        try {
            $recepcion = DB::transaction(function () use ($validatedData, $usuarioId) {
                $tipoRecepcion = ($validatedData['tipo_recepcion'] ?? 'total') === 'parcial' ? 'parcial' : 'total';
                $rec = Recepcion::create([
                    'orden_compra_id' => $validatedData['orden_compra_id'],
                    'usuario_id' => $usuarioId,
                    'tipo_recepcion' => $tipoRecepcion,
                    'fecha_hora' => now(),
                ]);

                foreach ($validatedData['detalles'] as $detalle) {
                    RecepcionDetalle::create([
                        'recepcion_id' => $rec->id,
                        'producto_id' => $detalle['producto_id'],
                        'cantidad_recibida' => $detalle['cantidad_recibida'],
                    ]);

                    // Bloque para actualizar stock en inventario
                    $inv = \App\Models\Inventario::firstOrNew(['producto_id' => $detalle['producto_id']]);
                    $inv->stock_actual = ($inv->stock_actual ?? 0) + (int)$detalle['cantidad_recibida'];
                    $inv->save();

                    // Bloque para registrar movimiento de entrada en inventario
                    \App\Models\MovimientoInventario::create([
                        'producto_id' => $detalle['producto_id'],
                        'usuario_id' => $usuarioId,
                        'tipo' => 'entrada',
                        'cantidad' => $detalle['cantidad_recibida'],
                        'justificacion' => 'Recepción de mercancía OC-' . str_pad($validatedData['orden_compra_id'], 4, '0', STR_PAD_LEFT),
                        'fecha_hora' => now(),
                    ]);
                }

                // Bloque para actualizar estado de la orden de compra
                $nuevoEstado = $tipoRecepcion === 'parcial' ? 'recibida_parcial' : 'recibida_total';
                \App\Models\OrdenCompra::where('id', $validatedData['orden_compra_id'])->update([
                    'estado' => $nuevoEstado
                ]);

                return $rec;
            });

            return response()->json($recepcion->load(['detalles.producto', 'ordenCompra']), 201);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al guardar la recepción: ' . $e->getMessage()], 500);
        }
    }

    // Bloque para consultar el detalle de una recepción específica
    public function show($id)
    {
        return Recepcion::with(['usuario', 'ordenCompra.proveedor', 'detalles.producto'])->findOrFail($id);
    }
}