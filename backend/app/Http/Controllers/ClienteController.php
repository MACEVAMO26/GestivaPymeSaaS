<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Cliente;
use App\Models\Venta;
use App\Models\CotizacionPedido;
use App\Models\TicketServicio;

class ClienteController extends Controller
{
    private function getEmpresaId()
    {
        return request()->header('X-Empresa-Id') ?? (Auth::user()?->empresa_id ?? null);
    }

    public function index()
    {
        $empresaId = $this->getEmpresaId();
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $clientes = Cliente::where('empresa_id', $empresaId)
            ->where('activo', 1)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($clientes);
    }

    public function show($id)
    {
        $empresaId = $this->getEmpresaId();
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $cliente = Cliente::with([
            'ventas.detalles.producto',
            'cotizacionesPedidos.detalles.producto',
            'tickets.materiales.producto',
            'tickets.tecnico.usuario'
        ])
        ->where('empresa_id', $empresaId)
        ->findOrFail($id);

        return response()->json($cliente);
    }

    public function store(Request $request)
    {
        $empresaId = $this->getEmpresaId();
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $validated = $request->validate([
            'nombres' => 'nullable|string|max:255',
            'apellidos' => 'nullable|string|max:255',
            'nombre_razon_social' => 'nullable|string|max:255',
            'documento' => 'required|string|max:50',
            'email' => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:50',
            'direccion' => 'nullable|string|max:255',
            'ciudad' => 'nullable|string|max:255',
            'tipo_cliente' => 'nullable|string|max:50',
            'membresia' => 'nullable|string|max:100',
            'pedidos_activos' => 'nullable|integer',
            'estado_pedido' => 'nullable|string|max:100',
            'estado_financiero' => 'nullable|string|max:100',
            'comentarios' => 'nullable|string',
        ]);

        $validated['empresa_id'] = $empresaId;
        if (empty($validated['nombre_razon_social'])) {
            $validated['nombre_razon_social'] = trim(($validated['nombres'] ?? '') . ' ' . ($validated['apellidos'] ?? ''));
        }
        if (empty($validated['nombres'])) {
            $validated['nombres'] = $validated['nombre_razon_social'] ?? '';
        }
        $validated['activo'] = 1;

        $cliente = Cliente::create($validated);

        return response()->json([
            'message' => 'Cliente registrado exitosamente',
            'cliente' => $cliente
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $empresaId = $this->getEmpresaId();
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $cliente = Cliente::where('empresa_id', $empresaId)->findOrFail($id);

        $validated = $request->validate([
            'nombres' => 'nullable|string|max:255',
            'apellidos' => 'nullable|string|max:255',
            'nombre_razon_social' => 'nullable|string|max:255',
            'documento' => 'required|string|max:50',
            'email' => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:50',
            'direccion' => 'nullable|string|max:255',
            'ciudad' => 'nullable|string|max:255',
            'tipo_cliente' => 'nullable|string|max:50',
            'membresia' => 'nullable|string|max:100',
            'pedidos_activos' => 'nullable|integer',
            'estado_pedido' => 'nullable|string|max:100',
            'estado_financiero' => 'nullable|string|max:100',
            'comentarios' => 'nullable|string',
        ]);

        if (empty($validated['nombre_razon_social'])) {
            $validated['nombre_razon_social'] = trim(($validated['nombres'] ?? '') . ' ' . ($validated['apellidos'] ?? ''));
        }
        if (empty($validated['nombres'])) {
            $validated['nombres'] = $validated['nombre_razon_social'] ?? '';
        }

        $cliente->update($validated);

        return response()->json([
            'message' => 'Cliente actualizado exitosamente',
            'cliente' => $cliente
        ]);
    }

    public function destroy($id)
    {
        $empresaId = $this->getEmpresaId();
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $cliente = Cliente::where('empresa_id', $empresaId)->findOrFail($id);
        $cliente->activo = 0;
        $cliente->inactive_at = now();
        $cliente->save();

        return response()->json(['message' => 'Cliente inactivado exitosamente']);
    }

    public function historial360($id)
    {
        $empresaId = $this->getEmpresaId();
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $cliente = Cliente::where('empresa_id', $empresaId)->findOrFail($id);

        // 1. Obtener Ventas asociadas
        $ventas = Venta::with('detalles.producto')
            ->where('empresa_id', $empresaId)
            ->where(function($q) use ($cliente) {
                $q->where('cliente_id', $cliente->id)
                  ->orWhereHas('cliente', function($sq) use ($cliente) {
                      $sq->where('documento', $cliente->documento);
                  });
            })
            ->orderBy('id', 'desc')
            ->get();

        // 2. Obtener Cotizaciones / Pedidos
        $cotizaciones = CotizacionPedido::with('detalles.producto')
            ->where('cliente_id', $cliente->id)
            ->orderBy('id', 'desc')
            ->get();

        // 3. Obtener Tickets de Servicios
        $nombreClienteLower = strtolower(trim($cliente->nombre_razon_social ?: "{$cliente->nombres} {$cliente->apellidos}"));
        $tickets = TicketServicio::with(['materiales.producto', 'tecnico.usuario'])
            ->where('empresa_id', $empresaId)
            ->where(function($q) use ($cliente, $nombreClienteLower) {
                $q->where('cliente_id', $cliente->id)
                  ->orWhereRaw('LOWER(cliente_nombre) = ?', [$nombreClienteLower])
                  ->orWhereRaw('LOWER(cliente_nombre) LIKE ?', ['%' . strtolower(trim($cliente->nombres)) . '%']);
            })
            ->orderBy('id', 'desc')
            ->get();

        // 4. Calcular Métricas 360
        $totalVentas = $ventas->sum('total');
        $serviciosFinalizados = $tickets->where('estado', 'Finalizado');
        $calificaciones = $serviciosFinalizados->pluck('calificacion_tecnico')->filter();
        $promedioCalif = $calificaciones->count() > 0 ? round($calificaciones->avg(), 1) : 5.0;

        // 5. Construir Línea de Tiempo Cronológica Unificada
        $timeline = [];

        foreach ($ventas as $v) {
            $timeline[] = [
                'tipo' => 'VENTA',
                'icono' => 'fas fa-shopping-cart',
                'color' => '#066810',
                'fecha' => $v->created_at ? $v->created_at->format('Y-m-d H:i') : null,
                'titulo' => "Factura #{$v->factura_consecutivo}",
                'descripcion' => "Compra de productos por " . number_format($v->total, 0, ',', '.') . " COP (Pago: {$v->metodo_pago})",
                'monto' => (float)$v->total,
                'estado' => $v->estado ?? 'Pagado',
                'detalles' => $v->detalles->map(function($d) {
                    return [
                        'producto' => $d->producto?->nombre ?? 'Producto',
                        'cantidad' => $d->cantidad,
                        'precio' => $d->precio_unitario,
                        'subtotal' => $d->subtotal
                    ];
                })
            ];
        }

        foreach ($cotizaciones as $c) {
            $esPedido = strtolower($c->tipo) === 'pedido';
            $timeline[] = [
                'tipo' => $esPedido ? 'PEDIDO' : 'COTIZACION',
                'icono' => $esPedido ? 'fas fa-clipboard-check' : 'fas fa-file-invoice-dollar',
                'color' => $esPedido ? '#45a1ae' : '#7C6FA6',
                'fecha' => $c->fecha_hora ? $c->fecha_hora : ($c->created_at ? $c->created_at->format('Y-m-d H:i') : null),
                'titulo' => ucfirst($c->tipo) . " #{$c->id}",
                'descripcion' => "Total: " . number_format($c->total, 0, ',', '.') . " COP (Estado: {$c->estado})",
                'monto' => (float)$c->total,
                'estado' => $c->estado ?? 'Pendiente',
                'detalles' => $c->detalles->map(function($d) {
                    return [
                        'producto' => $d->producto?->nombre ?? 'Item',
                        'cantidad' => $d->cantidad,
                        'precio' => $d->precio_unitario,
                        'subtotal' => $d->subtotal
                    ];
                })
            ];
        }

        foreach ($tickets as $t) {
            $tecNom = $t->tecnico?->usuario?->nombres ?? 'Sin Asignar';
            $timeline[] = [
                'tipo' => 'SERVICIO',
                'icono' => $t->estado === 'Finalizado' ? 'fas fa-check-circle' : 'fas fa-tools',
                'color' => $t->estado === 'Finalizado' ? '#066810' : '#C9A227',
                'fecha' => $t->fecha_finalizacion ? $t->fecha_finalizacion->format('Y-m-d H:i') : ($t->fecha_solicitada ? "{$t->fecha_solicitada} {$t->hora_sugerida}" : ($t->created_at ? $t->created_at->format('Y-m-d H:i') : null)),
                'titulo' => "Servicio {$t->consecutivo}: {$t->servicio_requerido}",
                'descripcion' => "Estado: {$t->estado} | Técnico: {$tecNom} | Lugar: {$t->direccion}",
                'monto' => (float)$t->costo_total,
                'estado' => $t->estado,
                'calificacion_tecnico' => $t->calificacion_tecnico,
                'feedback_tecnico' => $t->feedback_tecnico,
                'calificacion_cliente' => $t->calificacion_cliente,
                'feedback_cliente' => $t->feedback_cliente,
                'equipo_recibido' => $t->equipo_recibido,
                'falla_reportada' => $t->falla_reportada
            ];
        }

        // Ordenar cronológicamente descendente (más reciente primero)
        usort($timeline, function($a, $b) {
            return strcmp($b['fecha'] ?? '', $a['fecha'] ?? '');
        });

        return response()->json([
            'cliente' => $cliente,
            'metricas' => [
                'total_compras' => $totalVentas,
                'cantidad_ventas' => $ventas->count(),
                'cantidad_cotizaciones' => $cotizaciones->count(),
                'cantidad_servicios' => $tickets->count(),
                'servicios_finalizados' => $serviciosFinalizados->count(),
                'calificacion_promedio' => $promedioCalif,
                'pedidos_activos' => $cliente->pedidos_activos ?? 0
            ],
            'ventas' => $ventas,
            'cotizaciones' => $cotizaciones,
            'tickets' => $tickets,
            'timeline' => $timeline
        ]);
    }
}
