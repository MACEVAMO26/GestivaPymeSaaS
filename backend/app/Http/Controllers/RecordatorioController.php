<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Recordatorio;
use Illuminate\Support\Facades\Auth;

class RecordatorioController extends Controller
{
    // Bloque para listar todos los recordatorios activos del usuario autenticado ordenados cronológicamente
    public function index(Request $request)
    {
        // Bloque de verificación de autenticación del usuario
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        // Bloque de consulta de recordatorios por usuario
        $recordatorios = Recordatorio::where('usuario_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($recordatorios);
    }

    // Bloque para registrar un nuevo recordatorio en la base de datos
    public function store(Request $request)
    {
        // Bloque de verificación de autenticación del usuario
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        // Bloque de reglas de validación de campos del recordatorio
        $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'required|string',
        ]);

        // Bloque de guardado del nuevo recordatorio en BD
        $recordatorio = Recordatorio::create([
            'usuario_id' => $user->id,
            'titulo' => $request->titulo,
            'descripcion' => $request->descripcion,
            'completado' => false,
        ]);

        return response()->json($recordatorio, 201);
    }

    // Bloque para marcar un recordatorio como completado en la base de datos
    public function marcarCompletado(Request $request, $id)
    {
        // Bloque de verificación de autenticación del usuario
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        // Bloque de búsqueda del recordatorio por ID y usuario
        $recordatorio = Recordatorio::where('usuario_id', $user->id)->where('id', $id)->first();
        if (!$recordatorio) {
            return response()->json(['error' => 'Recordatorio no encontrado'], 404);
        }

        // Bloque de actualización de estado completado
        $recordatorio->completado = true;
        $recordatorio->save();

        return response()->json($recordatorio);
    }

    // Bloque para eliminar un recordatorio de la base de datos
    public function destroy(Request $request, $id)
    {
        // Bloque de verificación de autenticación del usuario
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        // Bloque de búsqueda y eliminación física del recordatorio
        $recordatorio = Recordatorio::where('usuario_id', $user->id)->where('id', $id)->first();
        if (!$recordatorio) {
            return response()->json(['error' => 'Recordatorio no encontrado'], 404);
        }

        $recordatorio->delete();

        return response()->json(['message' => 'Recordatorio eliminado']);
    }
}
