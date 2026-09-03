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
            $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);

            $venta = DB::transaction(function () use ($request, $empresaId) {
                $subtotal = 0;
                foreach ($request->productos as $p) {
                    $subtotal += $p['cantidad'] * $p['precio_unitario'];
                }

                // Siguiente consecutivo de factura por empresa formateado (e.g. FAC-001)
                $lastVenta = Venta::where('empresa_id', $empresaId)->orderBy('id', 'desc')->first();
                $nextNum = 1;
                if ($lastVenta && !empty($lastVenta->factura_consecutivo)) {
                    if (preg_match('/(\d+)/', (string)$lastVenta->factura_consecutivo, $matches)) {
                        $nextNum = ((int)$matches[1]) + 1;
                    }
                }
                $consecutivo = 'FAC-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);

                $v = Venta::create([
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
                    'empresa_id' => $empresaId
                ]);

                foreach ($request->productos as $p) {
                    VentaDetalle::create([
                        'venta_id' => $v->id,
                        'producto_id' => $p['id'],
                        'cantidad' => $p['cantidad'],
                        'precio_unitario' => $p['precio_unitario'],
                        'subtotal' => $p['cantidad'] * $p['precio_unitario']
                    ]);

                    // Descontar inventario (esquema real: stock_actual)
                    DB::table('inventario')->where('producto_id', $p['id'])->update([
                        'stock_actual' => DB::raw('stock_actual - ' . (int)$p['cantidad']),
                        'updated_at' => now()
                    ]);
                    $inventario = Inventario::where('producto_id', $p['id'])->first();

                    // Registrar movimiento de salida en inventario
                    \App\Models\MovimientoInventario::create([
                        'producto_id' => $p['id'],
                        'usuario_id' => Auth::id() ?? 1,
                        'tipo' => 'salida',
                        'cantidad' => (int)$p['cantidad'],
                        'justificacion' => 'Venta Factura #' . $consecutivo,
                        'fecha_hora' => now()->toDateTimeString(),
                    ]);

                    // Notificación de stock bajo (umbral = stock_minimo)
                    if ($inventario && $inventario->stock_actual <= $inventario->stock_minimo) {
                        $producto = \App\Models\Producto::find($p['id']);
                        \App\Models\Notificacion::create([
                            'usuario_id' => Auth::id() ?? 1,
                            'titulo' => 'Alerta de Stock Bajo',
                            'descripcion' => 'El producto "' . ($producto ? $producto->nombre : 'ID '.$p['id']) . '" tiene un stock bajo (' . $inventario->stock_actual . ' unidades restantes).',
                            'leida' => '0',
                            'fecha_hora' => now(),
                        ]);
                    }
                }

                return $v;
            });

            // Enviar correo al cliente
            $cliente = Cliente::find($request->cliente_id);
            if ($cliente && $cliente->email && !empty(config('mail.mailers.smtp.username'))) {
                try {
                    Mail::to($cliente->email)->send(new ReciboVentaMail($venta, $cliente));
                } catch (\Throwable $e) {
                    \Log::warning('No se pudo enviar recibo de venta: ' . $e->getMessage());
                }
            }

            return response()->json([
                'message' => 'Venta registrada con éxito',
                'venta' => $venta
            ], 201);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al registrar la venta: ' . $e->getMessage()], 500);
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
        if ($cliente && $cliente->email && !empty(config('mail.mailers.smtp.username'))) {
            try {
                Mail::to($cliente->email)->send(new ReciboVentaMail($venta, $cliente, true));
            } catch (\Throwable $e) {
                \Log::warning('No se pudo enviar actualización de estado de paquete: ' . $e->getMessage());
            }
        }

        return response()->json(['message' => 'Estado del paquete actualizado', 'venta' => $venta]);
    }

    // Anula una venta: restaura el inventario descontado y marca la venta como Anulada
    public function anularVenta($id)
    {
        $venta = Venta::findOrFail($id);

        if (strtolower($venta->estado) === 'anulada') {
            return response()->json(['message' => 'La venta ya está anulada.'], 422);
        }

        try {
            $ventaActualizada = DB::transaction(function () use ($venta) {
                // Restaurar el inventario de cada detalle
                $detalles = VentaDetalle::where('venta_id', $venta->id)->get();
                foreach ($detalles as $detalle) {
                    $prodId = (int)$detalle->producto_id;
                    $cant = (int)$detalle->cantidad;

                    DB::table('inventario')->where('producto_id', $prodId)->update([
                        'stock_actual' => DB::raw('stock_actual + ' . $cant),
                        'updated_at' => now()
                    ]);

                    // Registrar movimiento de retorno al inventario por anulación
                    \App\Models\MovimientoInventario::create([
                        'producto_id' => $prodId,
                        'usuario_id' => Auth::id() ?? 1,
                        'tipo' => 'entrada',
                        'cantidad' => $cant,
                        'justificacion' => 'Anulacion Venta ' . $venta->factura_consecutivo,
                        'fecha_hora' => now()->toDateTimeString(),
                    ]);
                }

                DB::table('ventas')->where('id', $venta->id)->update([
                    'estado' => 'Anulada',
                    'updated_at' => now(),
                ]);

                $venta->refresh();
                return $venta;
            });

            return response()->json(['message' => 'Venta anulada correctamente.', 'venta' => $ventaActualizada]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al anular la venta: ' . $e->getMessage()], 500);
        }
    }
}