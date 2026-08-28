<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\Inventario;
use App\Models\Cliente;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\ReciboVentaMail;
use Illuminate\Support\Facades\Auth;

class VentaController extends Controller
{
    public function index()
    {
        $empresaId = auth()->user()?->empresa_id ?? null;
        $ventas = Venta::with('cliente')
            ->when($empresaId, fn ($q) => $q->where('empresa_id', $empresaId))
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($ventas);
    }

    public function store(Request $request)
    {
        $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'metodo_pago' => 'required|string',
            'productos' => 'required|array',
            'productos.*.id' => 'required|exists:productos,id',
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.precio_unitario' => 'required|numeric',
        ]);

        try {
            DB::beginTransaction();

            $subtotal = 0;
            foreach ($request->productos as $p) {
                $subtotal += $p['cantidad'] * $p['precio_unitario'];
            }

            // Siguiente consecutivo de factura por empresa
            $consecutivo = (Venta::where('empresa_id', auth()->user()?->empresa_id)
                ->max('factura_consecutivo') ?? 0) + 1;

            $venta = Venta::create([
                'factura_consecutivo' => $consecutivo,
                'cliente_id' => $request->cliente_id,
                'subtotal' => $subtotal,
                'impuestos' => 0,
                'descuentos' => 0,
                'total' => $subtotal,
                'metodo_pago' => $request->metodo_pago,
                'estado' => 'Completada',
                'estado_paquete' => 'Preparando',
                'vendedor_id' => Auth::id(),
                'empresa_id' => auth()->user()?->empresa_id ?? null
            ]);

            foreach ($request->productos as $p) {
                VentaDetalle::create([
                    'venta_id' => $venta->id,
                    'producto_id' => $p['id'],
                    'cantidad' => $p['cantidad'],
                    'precio_unitario' => $p['precio_unitario'],
                    'subtotal' => $p['cantidad'] * $p['precio_unitario']
                ]);

                // Descontar inventario (esquema real: stock_actual)
                $inventario = Inventario::where('producto_id', $p['id'])->first();
                if ($inventario) {
                    $inventario->stock_actual -= $p['cantidad'];
                    $inventario->save();

                    // Notificación de stock bajo (umbral = stock_minimo)
                    if ($inventario->stock_actual <= $inventario->stock_minimo) {
                        $producto = \App\Models\Producto::find($p['id']);
                        \App\Models\Notificacion::create([
                            'usuario_id' => Auth::id(),
                            'titulo' => 'Alerta de Stock Bajo',
                            'descripcion' => 'El producto "' . ($producto ? $producto->nombre : 'ID '.$p['id']) . '" tiene un stock bajo (' . $inventario->stock_actual . ' unidades restantes).',
                            'leida' => false
                        ]);
                    }
                }
            }

            DB::commit();

            // Enviar correo al cliente
            $cliente = Cliente::find($request->cliente_id);
            if ($cliente && $cliente->email) {
                try {
                    Mail::to($cliente->email)->send(new ReciboVentaMail($venta, $cliente));
                } catch (\Exception $e) {
                    \Log::error('No se pudo enviar recibo de venta: ' . $e->getMessage());
                }
            }

            return response()->json([
                'message' => 'Venta registrada con éxito',
                'venta' => $venta
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al registrar la venta', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateEstadoPaquete(Request $request, $id)
    {
        $request->validate([
            'estado_paquete' => 'required|in:Preparando,En camino,Entregado',
            'cliente_id' => 'required|exists:clientes,id' // para saber a quien notificar
        ]);

        $venta = Venta::findOrFail($id);
        $venta->estado_paquete = $request->estado_paquete;
        $venta->save();

        $cliente = Cliente::find($request->cliente_id);
        if ($cliente && $cliente->email) {
            try {
                Mail::to($cliente->email)->send(new ReciboVentaMail($venta, $cliente, true));
            } catch (\Exception $e) {
                \Log::error('No se pudo enviar actualización de estado de paquete: ' . $e->getMessage());
            }
        }

        return response()->json(['message' => 'Estado del paquete actualizado', 'venta' => $venta]);
    }

    // Anula una venta: restaura el inventario descontado y marca la venta como Anulada
    public function anularVenta($id)
    {
        $venta = Venta::findOrFail($id);

        if ($venta->estado === 'Anulada') {
            return response()->json(['message' => 'La venta ya está anulada.'], 422);
        }

        try {
            DB::beginTransaction();

            // Restaurar el inventario de cada detalle
            $detalles = VentaDetalle::where('venta_id', $venta->id)->get();
            foreach ($detalles as $detalle) {
                $inventario = Inventario::where('producto_id', $detalle->producto_id)->first();
                if ($inventario) {
                    $inventario->stock_actual += $detalle->cantidad;
                    $inventario->save();
                }
            }

            $venta->estado = 'Anulada';
            $venta->estado_paquete = null;
            $venta->save();

            DB::commit();
            return response()->json(['message' => 'Venta anulada correctamente.', 'venta' => $venta]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al anular la venta', 'error' => $e->getMessage()], 500);
        }
    }
}