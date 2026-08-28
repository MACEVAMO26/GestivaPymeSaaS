<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\CalendarioEvento;

class CalendarioEventoController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $eventos = CalendarioEvento::where('usuario_id', $user->id)
            ->orderBy('fecha_inicio', 'asc')
            ->get();

        return response()->json($eventos);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'fecha_inicio' => 'required|date',
            'fecha_fin' => 'required|date|after_or_equal:fecha_inicio',
            'color_etiqueta' => 'nullable|string|max:20',
        ]);

        $evento = CalendarioEvento::create([
            'usuario_id' => $user->id,
            'titulo' => $validated['titulo'],
            'descripcion' => $validated['descripcion'] ?? null,
            'fecha_inicio' => $validated['fecha_inicio'],
            'fecha_fin' => $validated['fecha_fin'],
            'color_etiqueta' => $validated['color_etiqueta'] ?? '#4C6FFF',
        ]);

        return response()->json($evento, 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $evento = CalendarioEvento::where('usuario_id', $user->id)->findOrFail($id);

        $validated = $request->validate([
            'titulo' => 'sometimes|string|max:255',
            'descripcion' => 'nullable|string',
            'fecha_inicio' => 'sometimes|date',
            'fecha_fin' => 'sometimes|date',
            'color_etiqueta' => 'nullable|string|max:20',
        ]);

        $evento->update($validated);

        return response()->json($evento);
    }

    public function destroy($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $evento = CalendarioEvento::where('usuario_id', $user->id)->findOrFail($id);
        $evento->delete();

        return response()->json(['message' => 'Evento eliminado']);
    }
}
