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
    // Bloque para listar el histórico de ventas filtrado por empresa
    public function index()
    {
        $empresaId = auth()->user()?->empresa_id ?? null;
        $ventas = Venta::with('cliente')
            ->when($empresaId, fn ($q) => $q->where('empresa_id', $empresaId))
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($ventas);
    }

    // Bloque para registrar una nueva venta en el sistema POS con control de inventario y notificación
    public function store(Request $request)
    {
        // Bloque de reglas de validación
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

            // Bloque de transacción para registrar venta y descontar existencias en BD
            $venta = DB::transaction(function () use ($request, $empresaId) {
                $subtotal = 0;
                foreach ($request->productos as $p) {
                    $subtotal += $p['cantidad'] * $p['precio_unitario'];
                }

                // Bloque para generar consecutivo de factura por empresa
                $lastVenta = Venta::where('empresa_id', $empresaId)->orderBy('id', 'desc')->first();
                $nextNum = 1;
                if ($lastVenta && !empty($lastVenta->factura_consecutivo)) {
                    if (preg_match('/(\d+)/', (string)$lastVenta->factura_consecutivo, $matches)) {
                        $nextNum = ((int)$matches[1]) + 1;
                    }
                }
                $consecutivo = 'FAC-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);

                // Bloque de guardado en BD
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
                    $cantSolicitada = (int)$p['cantidad'];

                    // Bloque para verificar existencias con bloqueo pesimista
                    $inventario = DB::table('inventario')
                        ->where('producto_id', $p['id'])
                        ->lockForUpdate()
                        ->first();

                    $producto = \App\Models\Producto::find($p['id']);
                    $nombreProd = $producto ? $producto->nombre : "ID " . $p['id'];
                    $stockActual = $inventario ? (int)$inventario->stock_actual : 0;

                    if (!$inventario || $stockActual < $cantSolicitada) {
                        $mensaje = $stockActual <= 0
                            ? "El producto '{$nombreProd}' ya se encuentra agotado (Stock disponible: 0). No es posible completar la venta."
                            : "Stock insuficiente para '{$nombreProd}'. Solicitado: {$cantSolicitada}, Disponible: {$stockActual}.";

                        throw new \Exception($mensaje, 422);
                    }

                    // Bloque para registrar detalles de la venta en BD
                    VentaDetalle::create([
                        'venta_id' => $v->id,
                        'producto_id' => $p['id'],
                        'cantidad' => $cantSolicitada,
                        'precio_unitario' => $p['precio_unitario'],
                        'subtotal' => $cantSolicitada * $p['precio_unitario']
                    ]);

                    // Bloque para descontar inventario de forma atómica
                    $nuevoStock = $stockActual - $cantSolicitada;
                    DB::table('inventario')->where('producto_id', $p['id'])->update([
                        'stock_actual' => $nuevoStock,
                        'updated_at' => now()
                    ]);

                    // Bloque para registrar movimiento de salida en inventario
                    \App\Models\MovimientoInventario::create([
                        'producto_id' => $p['id'],
                        'usuario_id' => Auth::id() ?? 1,
                        'tipo' => 'salida',
                        'cantidad' => $cantSolicitada,
                        'justificacion' => 'Venta Factura #' . $consecutivo,
                        'fecha_hora' => now()->toDateTimeString(),
                    ]);

                    // Bloque para registrar alerta de stock bajo si aplica
                    if ($inventario && $nuevoStock <= $inventario->stock_minimo) {
                        \App\Models\Notificacion::create([
                            'usuario_id' => Auth::id() ?? 1,
                            'titulo' => 'Alerta de Stock Bajo',
                            'descripcion' => 'El producto "' . $nombreProd . '" tiene un stock bajo (' . $nuevoStock . ' unidades restantes).',
                            'leida' => '0',
                            'fecha_hora' => now(),
                        ]);
                    }
                }

                return $v;
            });

            // Bloque para enviar recibo de venta por correo electrónico al cliente
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
            $code = $e->getCode() === 422 ? 422 : 500;
            return response()->json([
                'error' => $code === 422 ? 'stock_agotado' : 'error_servidor',
                'message' => $e->getMessage()
            ], $code);
        }
    }

    // Bloque para actualizar el estado logístico del paquete de una venta
    public function updateEstadoPaquete(Request $request, $id)
    {
        // Bloque de reglas de validación
        $request->validate([
            'estado_paquete' => 'required|in:Preparando,En camino,Entregado',
            'cliente_id' => 'required|exists:clientes,id'
        ]);

        // Bloque de guardado en BD
        $venta = Venta::findOrFail($id);
        $venta->estado_paquete = $request->estado_paquete;
        $venta->save();

        // Bloque para notificar actualización de entrega por correo electrónico
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

    // Bloque para anular una venta restituyendo las existencias al inventario
    public function anularVenta($id)
    {
        $venta = Venta::findOrFail($id);

        if (strtolower($venta->estado) === 'anulada') {
            return response()->json(['message' => 'La venta ya está anulada.'], 422);
        }

        try {
            // Bloque de transacción para restaurar existencias y actualizar estado en BD
            $ventaActualizada = DB::transaction(function () use ($venta) {
                $detalles = VentaDetalle::where('venta_id', $venta->id)->get();
                foreach ($detalles as $detalle) {
                    $prodId = (int)$detalle->producto_id;
                    $cant = (int)$detalle->cantidad;

                    DB::table('inventario')->where('producto_id', $prodId)->update([
                        'stock_actual' => DB::raw('stock_actual + ' . $cant),
                        'updated_at' => now()
                    ]);

                    // Bloque para registrar movimiento de retorno al inventario por anulación
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
