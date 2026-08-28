<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

use Illuminate\Support\Facades\Auth;

class UpdateLastActivity
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();
            
            // Solo actualizar si la última actividad fue hace más de 5 minutos
            $lastActivity = $user->last_activity_at;
            $shouldUpdate = !$lastActivity || now()->diffInMinutes($lastActivity) >= 5;

            if ($shouldUpdate) {
                $user->last_activity_at = now();
                $user->timestamps = false;
                $user->save();
                $user->timestamps = true;
            }
        }

        return $next($request);
    }
}
