<?php

namespace App\Http\Controllers;

use App\Models\Reunion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReunionController extends Controller
{
    // Para traer la lista de reuniones filtradas
    public function index(Request $request)
    {
        $user = Auth::user();
        $user->load(['empleado', 'rol']);
        $area_id = $user->empleado ? $user->empleado->area_id : null;
        $rol = $user->rol ? $user->rol->nombre : null;

        $reuniones = Reunion::with(['organizador.empleado'])
            ->where('empresa_id', $user->empresa_id)
            ->where('fecha_hora', '>=', now())
            ->get()
            ->filter(function ($reunion) use ($user, $area_id, $rol) {
                if ($reunion->organizador_id === $user->id) {
                    return true;
                }
                
                if ($reunion->audiencia === 'todos') {
                    return true;
                }

                if ($reunion->audiencia === 'gerencia' && in_array($rol, ['Gerente General', 'Jefe de Área'])) {
                    return true;
                }

                if ($reunion->audiencia === 'area') {
                    $organizadorAreaId = $reunion->organizador && $reunion->organizador->empleado 
                        ? $reunion->organizador->empleado->area_id 
                        : null;
                    if ($organizadorAreaId && $organizadorAreaId === $area_id) {
                        return true;
                    }
                }

                return false;
            })
            ->sortBy('fecha_hora')
            ->values();

        return response()->json($reuniones);
    }

    // Para guardar una nueva reunion
    public function store(Request $request)
    {
        $user = Auth::user();
        $user->load('rol');
        $rol = $user->rol ? $user->rol->nombre : null;

        if (!in_array($rol, ['Gerente General', 'Jefe de Área'])) {
            return response()->json(['message' => 'No tienes permiso para crear reuniones'], 403);
        }

        $request->validate([
            'titulo' => 'required|string|max:255',
            'fecha_hora' => 'required|date',
            'tipo_encuentro' => 'required|in:virtual,presencial',
            'audiencia' => 'required|in:todos,area,gerencia',
            'descripcion' => 'nullable|string',
            'enlace_lugar' => 'nullable|string',
        ]);

        $data = $request->all();
        $data['organizador_id'] = $user->id;
        $data['empresa_id'] = $user->empresa_id;

        $reunion = Reunion::create($data);

        // Notificar a la audiencia
        $query = \App\Models\User::where('empresa_id', $user->empresa_id)
            ->where('id', '!=', $user->id); // Opcional: no notificar al que la crea

        if ($data['audiencia'] === 'gerencia') {
            $query->whereHas('rol', function($q) {
                $q->whereIn('nombre', ['Gerente General', 'Jefe de Área']);
            });
        } elseif ($data['audiencia'] === 'area') {
            $user->load('empleado');
            $area_id = $user->empleado ? $user->empleado->area_id : null;
            if ($area_id) {
                $query->whereHas('empleado', function($q) use ($area_id) {
                    $q->where('area_id', $area_id);
                });
            } else {
                // Si el organizador no tiene área, no se envía a nadie más (o solo a él)
                $query->where('id', -1); // Falla intencional para no traer a nadie
            }
        }

        $usuariosANotificar = $query->get();

        foreach ($usuariosANotificar as $u) {
            \App\Models\Notificacion::create([
                'usuario_id' => $u->id,
                'titulo' => 'Nueva Reunión Agendada',
                'descripcion' => "Se ha agendado: {$reunion->titulo} (" . ucfirst($reunion->tipo_encuentro) . ")",
                'leida' => false
            ]);
        }

        return response()->json([
            'message' => 'Reunión creada con éxito y notificada a los participantes',
            'data' => $reunion
        ], 201);
    }
}
