<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\CalendarioEvento;

class CalendarioEventoController extends Controller
{
    // Bloque para consultar los eventos de calendario del usuario autenticado
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

    // Bloque para registrar un nuevo evento en el calendario del usuario
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'fecha_inicio' => [
                'required',
                'date',
                function ($attribute, $value, $fail) {
                    if (strtotime($value) < (time() - 300)) {
                        $fail('No se pueden programar eventos en fechas u horas pasadas.');
                    }
                },
            ],
            'fecha_fin' => 'required|date|after_or_equal:fecha_inicio',
            'color_etiqueta' => 'nullable|string|max:20',
        ], [
            'fecha_inicio.required' => 'La fecha de inicio es obligatoria.',
            'fecha_fin.required' => 'La fecha de fin es obligatoria.',
            'fecha_fin.after_or_equal' => 'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
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

    // Bloque para actualizar los datos de un evento de calendario existente
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
            'fecha_inicio' => [
                'sometimes',
                'date',
                function ($attribute, $value, $fail) {
                    if (strtotime($value) < (time() - 300)) {
                        $fail('No se pueden programar eventos en fechas u horas pasadas.');
                    }
                },
            ],
            'fecha_fin' => 'sometimes|date|after_or_equal:fecha_inicio',
            'color_etiqueta' => 'nullable|string|max:20',
        ], [
            'fecha_fin.after_or_equal' => 'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
        ]);

        $evento->update($validated);

        return response()->json($evento);
    }

    // Bloque para eliminar un evento de calendario del usuario
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
