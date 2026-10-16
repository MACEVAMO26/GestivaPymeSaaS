<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class IaController extends Controller
{
    public function getSugerencias(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $rol = $user->rol->nombre ?? '';
        $area = $request->query('area', 'general'); // ej: ventas, tareas, inicio
        
        $sugerencias = [];

        // Lógica para plan básico: sugerencias estáticas según rol y área
        if (in_array($rol, ['Gerente General', 'Jefe de Área'])) {
            if ($area === 'ventas') {
                $sugerencias = [
                    'Revisa el resumen de ventas semanales.',
                    'Asigna nuevas metas a tu equipo comercial.'
                ];
            } elseif ($area === 'tareas') {
                $sugerencias = [
                    'Asigna tareas pendientes a los empleados inactivos.',
                    'Verifica el estado de las tareas entregadas hoy.'
                ];
            } else {
                $sugerencias = [
                    'Revisa los reportes financieros del mes.',
                    'Verifica si hay solicitudes administrativas pendientes.'
                ];
            }
        } else {
            // Asistente, Operativo, Vendedor
            if ($area === 'ventas') {
                $sugerencias = [
                    '¡Llega a tu meta de ventas de hoy!',
                    'Registra tus cotizaciones pendientes.'
                ];
            } elseif ($area === 'tareas') {
                $sugerencias = [
                    'Revisa tus tareas en estado "En Proceso".',
                    'Recuerda marcar las tareas como terminadas al finalizar.'
                ];
            } else {
                $sugerencias = [
                    'No olvides marcar tu turno de entrada/salida.',
                    '¿Tienes solicitudes pendientes de vacaciones?'
                ];
            }
        }

        // --- FETCH CUSTOM SUGGESTIONS (Directrices IA del Gerente) ---
        // Audiencia: 'Todos', 'Gerencia', 'Ventas', 'RRHH', 'Operativos'
        $audiencias = ['Todos'];
        $rolNombre = strtolower($rol);
        $cargoNombre = strtolower($user->empleado->cargo->nombre ?? ($user->cargo->nombre ?? ''));
        $areaNombre = strtolower($user->empleado->area->nombre ?? '');

        if (str_contains($rolNombre, 'gerente') || str_contains($rolNombre, 'administrador') || str_contains($rolNombre, 'jefe') || str_contains($rolNombre, 'coordinador')) {
            $audiencias[] = 'Gerencia';
        }

        if (str_contains($rolNombre, 'operativo') || str_contains($cargoNombre, 'operativo') || str_contains($rolNombre, 'auxiliar') || !str_contains($rolNombre, 'gerente')) {
            $audiencias[] = 'Operativos';
        }

        if (str_contains($rolNombre, 'venta') || str_contains($cargoNombre, 'venta') || str_contains($areaNombre, 'comercial') || str_contains($areaNombre, 'venta') || $area === 'ventas') {
            $audiencias[] = 'Ventas';
        }

        if (str_contains($rolNombre, 'rrhh') || str_contains($rolNombre, 'humana') || str_contains($cargoNombre, 'rrhh') || str_contains($cargoNombre, 'humana') || str_contains($areaNombre, 'rrhh') || str_contains($areaNombre, 'humana') || $area === 'empleados') {
            $audiencias[] = 'RRHH';
        }

        $directrices = \App\Models\IaSugerenciaPersonalizada::where('empresa_id', $user->empresa_id)
            ->where('activo', true)
            ->whereIn('audiencia', array_unique($audiencias))
            ->pluck('mensaje')
            ->toArray();

        // Mezclamos las estáticas con las directrices del gerente (Damos prioridad a las directrices personalizadas)
        $sugerencias = array_merge($directrices, $sugerencias);

        // Limitar a máximo 4 para no saturar la UI
        $sugerencias = array_slice($sugerencias, 0, 4);

        // Registrar la interacción de que la IA sugirió algo (Plan Básico)
        DB::table('ia_chat_history')->insert([
            'empresa_id' => $user->empresa_id,
            'rol' => 'assistant',
            'mensaje' => 'Sugerencias servidas en ' . $area,
            'modo' => 'basico',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'sugerencias' => $sugerencias,
            'directrices' => $directrices,
            'area' => $area,
            'rol' => $rol
        ]);
    }
}
