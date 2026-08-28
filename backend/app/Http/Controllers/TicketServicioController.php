<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\TicketServicio;
use App\Models\TicketMaterial;

class TicketServicioController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $tickets = TicketServicio::with('materiales')
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
        ]);

        $consecutivo = 'T-' . now()->format('Ymd') . '-' . str_pad((string)(TicketServicio::count() + 1), 4, '0', STR_PAD_LEFT);

        $ticket = TicketServicio::create([
            'empresa_id' => $user->empresa_id,
            'consecutivo' => $consecutivo,
            'cliente_nombre' => $validated['cliente_nombre'],
            'servicio_requerido' => $validated['servicio_requerido'],
            'fecha_solicitada' => $validated['fecha_solicitada'] ?? null,
            'hora_sugerida' => $validated['hora_sugerida'] ?? null,
            'direccion' => $validated['direccion'] ?? null,
            'estado' => $validated['estado'] ?? 'Pendiente',
        ]);

        return response()->json($ticket, 201);
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
        ]);

        $ticket = TicketServicio::where('empresa_id', $user->empresa_id)->findOrFail($id);

        $ticket->estado = $request->estado;
        if ($request->has('tecnico_id')) {
            $ticket->tecnico_id = $request->tecnico_id;
        }
        if ($request->has('notas_ejecucion')) {
            $ticket->notas_ejecucion = $request->notas_ejecucion;
        }
        $ticket->save();

        return response()->json($ticket->load('materiales'));
    }

    public function agregarMaterial(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $ticket = TicketServicio::where('empresa_id', $user->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'producto_id' => 'required|integer',
            'cantidad' => 'required|numeric|min:0',
        ]);

        $material = TicketMaterial::create([
            'ticket_id' => $ticket->id,
            'producto_id' => $validated['producto_id'],
            'cantidad' => $validated['cantidad'],
        ]);

        return response()->json($material, 201);
    }
}
