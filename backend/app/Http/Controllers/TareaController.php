<?php

namespace App\Http\Controllers;

use App\Models\Tarea;
use App\Models\Notificacion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TareaController extends Controller
{
    // Para listar tareas dependiendo del rol del usuario
    public function index(Request $request)
    {
        $user = Auth::user();
        $rolNombre = $user->rol->nombre ?? '';
        $user->load('empleado');
        $areaId = $user->empleado ? $user->empleado->area_id : null;

        $query = Tarea::with([
            'asignador:id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido',
            'asignado:id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido',
            'area:id,nombre'
        ])->where('empresa_id', $user->empresa_id);

        if (in_array($rolNombre, ['Gerente General', 'Jefe de Área'])) {
            $query->where(function ($q) use ($user) {
                $q->where('asignador_id', $user->id)
                  ->orWhere('asignado_id', $user->id);
            });
        } else {
            // Empleado/Operario: ve sus tareas individuales + las cooperativas de su área
            $query->where(function ($q) use ($user, $areaId) {
                $q->where('asignado_id', $user->id)
                  ->orWhere(function ($sub) use ($areaId) {
                      $sub->where('tipo', 'cooperativa');
                      if ($areaId) {
                          $sub->where('area_id', $areaId);
                      } else {
                          $sub->whereRaw('1 = 0');
                      }
                  });
            });
        }

        return response()->json($query->orderBy('id', 'desc')->get());
    }

    // Para asignar una nueva tarea
    public function store(Request $request)
    {
        $user = Auth::user();
        $rolNombre = $user->rol->nombre ?? '';

        if (!in_array($rolNombre, ['Gerente General', 'Jefe de Área'])) {
            // Un empleado normal solo puede asignarse tareas a sí mismo
            if ($request->asignado_id != $user->id) {
                return response()->json(['message' => 'No autorizado para asignar tareas a otros'], 403);
            }
        }

        $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'asignado_id' => 'required|exists:usuarios,id',
            'tipo' => 'nullable|in:individual,cooperativa',
            'area_id' => 'nullable|integer|exists:areas,id',
        ]);

        $tipo = $request->tipo ?? 'individual';

        $tarea = Tarea::create([
            'titulo' => $request->titulo,
            'descripcion' => $request->descripcion,
            'asignador_id' => $user->id,
            'asignado_id' => $request->asignado_id,
            'tipo' => $tipo,
            'area_id' => ($tipo === 'cooperativa') ? ($request->area_id ?? null) : null,
            'empresa_id' => $user->empresa_id,
        ]);

        return response()->json(['message' => 'Tarea creada con éxito', 'tarea' => $tarea], 201);
    }

    // Para actualizar el estado de una tarea
    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();
        $tarea = Tarea::where('empresa_id', $user->empresa_id)->findOrFail($id);

        if ($tarea->asignador_id !== $user->id && $tarea->asignado_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'estado' => 'required|in:notificada,vista,en_proceso,con_dificultades,terminada',
        ]);

        $tarea->update([
            'estado' => $request->estado,
        ]);

        // Si la tarea entra en dificultades, notificar al asignador (gerente/jefe de área)
        if ($request->estado === 'con_dificultades' && $tarea->asignador_id !== $user->id) {
            Notificacion::create([
                'usuario_id' => $tarea->asignador_id,
                'titulo' => 'Tarea con dificultades',
                'descripcion' => "La tarea \"{$tarea->titulo}\" fue marcada con dificultades. Revísala y da respuesta.",
                'leida' => false,
            ]);
        }

        return response()->json(['message' => 'Estado actualizado', 'tarea' => $tarea]);
    }
}