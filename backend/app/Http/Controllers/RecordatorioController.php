<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Recordatorio;
use Illuminate\Support\Facades\Auth;

class RecordatorioController extends Controller
{
    public function index(Request $request)
    {
        // Get user from token
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $recordatorios = Recordatorio::where('usuario_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($recordatorios);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'required|string',
        ]);

        $recordatorio = Recordatorio::create([
            'usuario_id' => $user->id,
            'titulo' => $request->titulo,
            'descripcion' => $request->descripcion,
            'completado' => false,
        ]);

        return response()->json($recordatorio, 201);
    }

    public function marcarCompletado(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $recordatorio = Recordatorio::where('usuario_id', $user->id)->where('id', $id)->first();
        if (!$recordatorio) {
            return response()->json(['error' => 'Recordatorio no encontrado'], 404);
        }

        $recordatorio->completado = true;
        $recordatorio->save();

        return response()->json($recordatorio);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $recordatorio = Recordatorio::where('usuario_id', $user->id)->where('id', $id)->first();
        if (!$recordatorio) {
            return response()->json(['error' => 'Recordatorio no encontrado'], 404);
        }

        $recordatorio->delete();

        return response()->json(['message' => 'Recordatorio eliminado']);
    }
}
