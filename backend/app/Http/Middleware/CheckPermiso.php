<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Permiso;

class CheckPermiso
{
    /**
     * Verifica que el usuario tenga el permiso de la acción sobre el módulo.
     * Uso: ->middleware('permiso:v_inv:ver') o ('permiso:v_inv')
     */
    public function handle(Request $request, Closure $next, string $modulo, string $accion = 'ver')
    {
        $user = Auth::user();
        if (!$user || !$user->empresa_id) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $rolId = $user->rol_id;
        if (!$rolId) {
            return response()->json(['message' => 'El usuario no tiene rol asignado'], 403);
        }

        // El Gerente General tiene acceso total (todos los permisos creados en EmpresaController)
        $permiso = Permiso::where('rol_id', $rolId)
            ->where('modulo_id', $modulo)
            ->first();

        if (!$permiso) {
            return response()->json(['message' => 'Sin permisos sobre este módulo'], 403);
        }

        $columna = 'puede_' . strtolower($accion);
        if (!in_array($columna, ['puede_ver', 'puede_crear', 'puede_editar', 'puede_inactivar', 'puede_descargar', 'puede_subir'])) {
            return response()->json(['message' => 'Acción de permiso no válida'], 400);
        }

        if (!$permiso->{$columna}) {
            return response()->json(['message' => 'No tienes permiso para esta acción'], 403);
        }

        return $next($request);
    }
}