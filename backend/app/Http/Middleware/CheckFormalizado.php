<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckFormalizado
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Si no hay usuario autenticado, dejar que el middleware auth se encargue
        if (!$user) {
            return $next($request);
        }

        // Si el usuario es Super Admin (Saas), empresa_id es null, no bloquear
        if (is_null($user->empresa_id)) {
            return $next($request);
        }

        // Si el usuario es Gerente o Administrador, no bloquear
        $roleName = $user->rol ? $user->rol->nombre : null;
        if (in_array($roleName, ['Admin Saas', 'Gerente General', 'Administrador'])) {
            return $next($request);
        }

        // Si es un empleado normal, verificar si está formalizado
        if (!$user->perfil_formalizado) {
            return response()->json([
                'error' => 'Tu perfil aún está siendo configurado por Gestión Humana.',
                'code' => 'NOT_FORMALIZED'
            ], 403);
        }

        return $next($request);
    }
}
