<?php

namespace App\Http\Controllers;

use App\Models\Notificacion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificacionController extends Controller
{
    // Bloque para obtener todas las notificaciones del usuario autenticado
    public function index()
    {
        $misNotificaciones = Notificacion::where('usuario_id', Auth::id())
                                         ->orderBy('created_at', 'desc')
                                         ->get();
                                         
        return response()->json($misNotificaciones);
    }

    // Bloque para registrar una nueva notificación en la base de datos
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'usuario_id' => 'required|integer|exists:usuarios,id',
            'titulo' => 'required|string|max:255',
            'descripcion' => 'required|string',
        ]);

        $validatedData['leida'] = false;

        $notificacion = Notificacion::create($validatedData);
        return response()->json($notificacion, 201);
    }

    // Bloque para marcar una notificación específica como leída
    public function marcarLeida(int $id)
    {
        $notificacion = Notificacion::where('usuario_id', Auth::id())->findOrFail($id);
        $notificacion->leida = true;
        $notificacion->save();

        return response()->json([
            'message' => 'Notificación marcada como leída.'
        ]);
    }
}