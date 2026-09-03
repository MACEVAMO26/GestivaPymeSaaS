<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\TicketServicio;
use App\Models\TicketMaterial;
use App\Models\Inventario;
use App\Models\MovimientoInventario;
use App\Models\Producto;

class TicketServicioController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $tickets = TicketServicio::with(['materiales.producto', 'tecnico.usuario', 'tecnico.cargo'])
            ->where('empresa_id', $user->empresa_id)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($tickets);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $validated = $request->validate([
            'cliente_nombre' => 'required|string|max:255',
            'servicio_requerido' => 'required|string|max:255',
            'fecha_solicitada' => 'nullable|date',
            'hora_sugerida' => 'nullable|string|max:10',
            'direccion' => 'nullable|string|max:255',
            'estado' => 'nullable|string|max:50',
            'tecnico_id' => 'nullable|integer',
            'equipo_recibido' => 'nullable|string|max:255',
            'serie_equipo' => 'nullable|string|max:255',
            'accesorios_recibidos' => 'nullable|string',
            'falla_reportada' => 'nullable|string',
            'notas_ejecucion' => 'nullable|string',
            'costo_total' => 'nullable|numeric|min:0'
        ]);

        $countToday = TicketServicio::where('empresa_id', $user->empresa_id)
            ->whereDate('created_at', now()->toDateString())
            ->count() + 1;

        $consecutivo = 'T-' . now()->format('Ymd') . '-' . str_pad((string)$countToday, 4, '0', STR_PAD_LEFT);

        $ticket = TicketServicio::create([
            'empresa_id' => $user->empresa_id,
            'consecutivo' => $consecutivo,
            'cliente_nombre' => $validated['cliente_nombre'],
            'servicio_requerido' => $validated['servicio_requerido'],
            'fecha_solicitada' => $validated['fecha_solicitada'] ?? now()->toDateString(),
            'hora_sugerida' => $validated['hora_sugerida'] ?? now()->format('H:i'),
            'direccion' => $validated['direccion'] ?? 'En Taller / Sede',
            'estado' => $validated['estado'] ?? 'Pendiente',
            'tecnico_id' => $validated['tecnico_id'] ?? null,
            'equipo_recibido' => $validated['equipo_recibido'] ?? null,
            'serie_equipo' => $validated['serie_equipo'] ?? null,
            'accesorios_recibidos' => $validated['accesorios_recibidos'] ?? null,
            'falla_reportada' => $validated['falla_reportada'] ?? null,
            'notas_ejecucion' => $validated['notas_ejecucion'] ?? null,
            'costo_total' => $validated['costo_total'] ?? 0,
        ]);

        // Si se enviaron materiales iniciales
        if ($request->has('materiales') && is_array($request->materiales)) {
            foreach ($request->materiales as $mat) {
                if (!empty($mat['producto_id']) && !empty($mat['cantidad'])) {
                    $prod = Producto::find($mat['producto_id']);
                    $precioUnit = $prod ? (float)$prod->precio : 0;
                    $cant = (float)$mat['cantidad'];
                    TicketMaterial::create([
                        'ticket_id' => $ticket->id,
                        'producto_id' => $mat['producto_id'],
                        'cantidad' => $cant,
                        'precio_unitario' => $precioUnit,
                        'subtotal' => $precioUnit * $cant,
                        'estado_material' => $mat['estado_material'] ?? 'Llevado'
                    ]);
                }
            }
        }

        return response()->json($ticket->load(['materiales.producto', 'tecnico.usuario']), 201);
    }

    public function cambiarEstado(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $request->validate([
            'estado' => 'required|string|max:50',
            'tecnico_id' => 'nullable|integer',
            'notas_ejecucion' => 'nullable|string',
            'tiempo_minutos' => 'nullable|integer|min:0',
            'costo_total' => 'nullable|numeric|min:0',
            'calificacion_tecnico' => 'nullable|integer|min:1|max:5',
            'feedback_tecnico' => 'nullable|string',
            'calificacion_cliente' => 'nullable|integer|min:1|max:5',
            'feedback_cliente' => 'nullable|string',
        ]);

        $ticket = TicketServicio::where('empresa_id', $user->empresa_id)->findOrFail($id);
        $estadoAnterior = $ticket->estado;
        $nuevoEstado = $request->estado;

        $ticket->estado = $nuevoEstado;
        if ($request->has('tecnico_id')) {
            $ticket->tecnico_id = $request->tecnico_id;
        }
        if ($request->has('notas_ejecucion')) {
            $ticket->notas_ejecucion = $request->notas_ejecucion;
        }
        if ($request->has('tiempo_minutos')) {
            $ticket->tiempo_minutos = $request->tiempo_minutos;
        }
        if ($request->has('costo_total')) {
            $ticket->costo_total = $request->costo_total;
        }
        if ($request->has('calificacion_tecnico')) {
            $ticket->calificacion_tecnico = $request->calificacion_tecnico;
        }
        if ($request->has('feedback_tecnico')) {
            $ticket->feedback_tecnico = $request->feedback_tecnico;
        }
        if ($request->has('calificacion_cliente')) {
            $ticket->calificacion_cliente = $request->calificacion_cliente;
        }
        if ($request->has('feedback_cliente')) {
            $ticket->feedback_cliente = $request->feedback_cliente;
        }

        // Si se finaliza el servicio
        if ($nuevoEstado === 'Finalizado') {
            if (!$ticket->fecha_finalizacion) {
                $ticket->fecha_finalizacion = now();
            }

            // Descontar inventario si no se ha finalizado previamente
            if ($estadoAnterior !== 'Finalizado') {
                $materiales = TicketMaterial::where('ticket_id', $ticket->id)->get();
                foreach ($materiales as $mat) {
                    $mat->estado_material = 'Utilizado';
                    $mat->save();

                    // Actualizar o decrementar en tabla inventario
                    $inv = Inventario::where('producto_id', $mat->producto_id)->first();
                    if ($inv) {
                        $inv->stock_actual = max(0, $inv->stock_actual - (int)$mat->cantidad);
                        $inv->save();
                    }

                    // Registrar movimiento de auditoría
                    MovimientoInventario::create([
                        'producto_id' => $mat->producto_id,
                        'usuario_id' => $user->id,
                        'tipo' => 'salida',
                        'cantidad' => (int)$mat->cantidad,
                        'justificacion' => "Consumo en Servicio Ticket {$ticket->consecutivo}",
                        'fecha_hora' => now()
                    ]);
                }
            }
        }

        $ticket->save();

        return response()->json($ticket->load(['materiales.producto', 'tecnico.usuario']));
    }

    public function agregarMaterial(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $ticket = TicketServicio::where('empresa_id', $user->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'producto_id' => 'required|integer|exists:productos,id',
            'cantidad' => 'required|numeric|min:0.01',
            'estado_material' => 'nullable|string|max:50',
        ]);

        $prod = Producto::find($validated['producto_id']);
        $precioUnit = $prod ? (float)$prod->precio : 0;
        $cant = (float)$validated['cantidad'];

        $material = TicketMaterial::create([
            'ticket_id' => $ticket->id,
            'producto_id' => $validated['producto_id'],
            'cantidad' => $cant,
            'precio_unitario' => $precioUnit,
            'subtotal' => $precioUnit * $cant,
            'estado_material' => $validated['estado_material'] ?? 'Llevado',
        ]);

        return response()->json($material->load('producto'), 201);
    }

    public function eliminarMaterial(Request $request, $id, $materialId)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $ticket = TicketServicio::where('empresa_id', $user->empresa_id)->findOrFail($id);
        $material = TicketMaterial::where('ticket_id', $ticket->id)->findOrFail($materialId);
        $material->delete();

        return response()->json(['message' => 'Material eliminado del servicio']);
    }

    public function calificar(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $request->validate([
            'calificacion_tecnico' => 'nullable|integer|min:1|max:5',
            'feedback_tecnico' => 'nullable|string',
            'calificacion_cliente' => 'nullable|integer|min:1|max:5',
            'feedback_cliente' => 'nullable|string',
        ]);

        $ticket = TicketServicio::where('empresa_id', $user->empresa_id)->findOrFail($id);

        if ($request->has('calificacion_tecnico')) {
            $ticket->calificacion_tecnico = $request->calificacion_tecnico;
        }
        if ($request->has('feedback_tecnico')) {
            $ticket->feedback_tecnico = $request->feedback_tecnico;
        }
        if ($request->has('calificacion_cliente')) {
            $ticket->calificacion_cliente = $request->calificacion_cliente;
        }
        if ($request->has('feedback_cliente')) {
            $ticket->feedback_cliente = $request->feedback_cliente;
        }

        $ticket->save();

        return response()->json([
            'message' => 'Calificación guardada exitosamente.',
            'ticket' => $ticket->load(['materiales.producto', 'tecnico.usuario'])
        ]);
    }
}
