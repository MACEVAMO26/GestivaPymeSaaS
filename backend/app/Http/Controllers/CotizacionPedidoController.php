<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\CotizacionPedido;
use App\Models\CotizacionPedidoDetalle;

class CotizacionPedidoController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $empresaId = request()->header('X-Empresa-Id') ?? ($user->empresa_id ?? null);

        $cotizaciones = CotizacionPedido::with(['detalles', 'cliente', 'usuario'])
            ->when($empresaId, function ($q) use ($empresaId) {
                $q->whereHas('cliente', function ($cq) use ($empresaId) {
                    $cq->where('empresa_id', $empresaId);
                });
            })
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($cotizaciones);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $validated = $request->validate([
            'cliente_id' => 'required|integer|exists:clientes,id',
            'vendedor_id' => 'nullable|integer|exists:usuarios,id',
            'tipo' => 'nullable|in:cotizacion,pedido,factura',
            'estado' => 'nullable|in:borrador,enviada,aprobada,convertida,facturada,anulada',
            'descuento' => 'nullable|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'motivo_anulacion' => 'nullable|string',
            'detalles' => 'nullable|array',
            'detalles.*.producto_id' => 'nullable|integer|exists:productos,id',
            'detalles.*.servicio_id' => 'nullable|integer|exists:servicios,id',
            'detalles.*.cantidad' => 'required_with:detalles|integer|min:1',
            'detalles.*.precio_unitario' => 'required_with:detalles|numeric|min:0',
        ]);

        $cotizacion = CotizacionPedido::create([
            'cliente_id' => $validated['cliente_id'],
            'usuario_id' => $validated['vendedor_id'] ?? $user->id,
            'tipo' => $validated['tipo'] ?? 'cotizacion',
            'estado' => $validated['estado'] ?? 'borrador',
            'descuento' => $validated['descuento'] ?? 0,
            'total' => $validated['total'],
            'motivo_anulacion' => $validated['motivo_anulacion'] ?? null,
            'fecha_hora' => now(),
        ]);

        if (!empty($validated['detalles'])) {
            foreach ($validated['detalles'] as $detalle) {
                $tipoItem = !empty($detalle['servicio_id']) ? 'servicio' : 'producto';
                $itemId = !empty($detalle['servicio_id']) ? $detalle['servicio_id'] : ($detalle['producto_id'] ?? null);

                if ($itemId) {
                    CotizacionPedidoDetalle::create([
                        'cotizacion_pedido_id' => $cotizacion->id,
                        'tipo_item' => $tipoItem,
                        'item_id' => $itemId,
                        'cantidad' => $detalle['cantidad'],
                        'precio_unitario' => $detalle['precio_unitario'],
                        'subtotal' => $detalle['precio_unitario'] * $detalle['cantidad'],
                    ]);
                }
            }
        }

        return response()->json($cotizacion->load('detalles'), 201);
    }

    public function show($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $cotizacion = CotizacionPedido::with(['detalles', 'cliente', 'usuario'])->findOrFail($id);
        return response()->json($cotizacion);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $cotizacion = CotizacionPedido::findOrFail($id);

        $validated = $request->validate([
            'cliente_id' => 'sometimes|integer|exists:clientes,id',
            'vendedor_id' => 'nullable|integer|exists:usuarios,id',
            'tipo' => 'nullable|in:cotizacion,pedido,factura',
            'estado' => 'nullable|in:borrador,enviada,aprobada,convertida,facturada,anulada',
            'descuento' => 'nullable|numeric|min:0',
            'total' => 'sometimes|numeric|min:0',
            'motivo_anulacion' => 'nullable|string',
        ]);

        if (isset($validated['vendedor_id'])) {
            $validated['usuario_id'] = $validated['vendedor_id'];
            unset($validated['vendedor_id']);
        }

        $cotizacion->update($validated);

        return response()->json($cotizacion);
    }

    public function cambiarEstado(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $request->validate([
            'estado' => 'required|in:borrador,enviada,aprobada,convertida,facturada,anulada',
            'motivo_anulacion' => 'nullable|string',
        ]);

        $cotizacion = CotizacionPedido::findOrFail($id);
        $cotizacion->estado = $request->estado;

        if ($request->estado === 'anulada' && $request->has('motivo_anulacion')) {
            $cotizacion->motivo_anulacion = $request->motivo_anulacion;
        }

        $cotizacion->save();

        return response()->json($cotizacion);
    }

    public function destroy($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $cotizacion = CotizacionPedido::findOrFail($id);
        $cotizacion->estado = 'anulada';
        $cotizacion->motivo_anulacion = 'Anulada por el usuario';
        $cotizacion->save();

        return response()->json(['message' => 'Cotización anulada correctamente.']);
    }
}
