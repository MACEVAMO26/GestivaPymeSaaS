<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AutogestionController extends Controller
{
    // --- ESTADÍSTICAS DE AUTOGESTIÓN DEL USUARIO ---
    public function getStats(Request $request)
    {
        $user = $request->user();
        $userId = $user->id;

        return response()->json([
            'afiliacion' => DB::table('afiliaciones')->where('user_id', $userId)->first(),
            'vacaciones_pendientes' => DB::table('vacaciones')->where('usuario_id', $userId)->where('estado', 'pendiente')->count(),
            'turnos_asignados' => DB::table('asignacion_turnos')->where('usuario_id', $userId)->count(),
            'tareas_pendientes' => DB::table('tareas')->where('asignado_id', $userId)->whereIn('estado', ['Pendiente', 'En Proceso'])->count(),
        ]);
    }

    // --- GESTIÓN DE AFILIACIONES PROPIAS ---
    // Obtiene los datos de afiliación del usuario autenticado, incluyendo la ARL y
    // Caja de Compensación configuradas por la empresa o en formalización.
    public function misAfiliaciones(Request $request)
    {
        $user = $request->user();
        $empleado = \App\Models\Empleado::where('usuario_id', $user->id)->first();
        $afiliacion = DB::table('afiliaciones')->where('user_id', $user->id)->first();

        // Leer la configuración global de Seguridad Social de la empresa
        $empresa = DB::table('empresa')->where('id', $user->empresa_id)->first();

        // Priorizar datos actualizados de Formalización/Empleado si existen
        $eps = $empleado?->eps ?: ($afiliacion?->eps ?? null);
        $afondo_pension = $empleado?->fondo_pension ?: ($afiliacion?->afondo_pension ?? null);
        $fondo_cesantias = $empleado?->fondo_cesantias ?: ($afiliacion?->fondo_cesantias ?? null);
        $arl = $empleado?->arl ?: ($afiliacion?->arl ?: ($empresa?->arl ?? null));
        $caja = $empleado?->caja_compensacion ?: ($empresa?->caja_compensacion ?? null);

        $afiliacionData = [
            'id' => $afiliacion->id ?? null,
            'user_id' => $user->id,
            'eps' => $eps,
            'arl' => $arl,
            'afondo_pension' => $afondo_pension,
            'fondo_cesantias' => $fondo_cesantias,
            'estado' => $afiliacion->estado ?? 'aprobado',
            'notas_rechazo' => $afiliacion->notas_rechazo ?? null,
            'fecha_contratacion' => $empleado?->fecha_contratacion ?: ($afiliacion?->fecha_contratacion ?? null),
            'finalizacion_contrato' => $empleado?->fecha_fin_contrato ?: ($afiliacion?->finalizacion_contrato ?? null),
            'renovacion_contrato' => $afiliacion?->renovacion_contrato ?? null,
            'veces_modificada' => $afiliacion->veces_modificada ?? 0,
            'documento_soporte_url' => $afiliacion->documento_soporte_url ?? null
        ];

        return response()->json([
            'afiliacion'              => $afiliacionData,
            'modulo_rrhh_activo'      => $this->empresaTieneRRHH($user),
            'arl_empresa'             => $arl,
            'caja_compensacion_empresa' => $caja,
        ]);
    }

    // ¿La empresa del usuario tiene activo el módulo Gestión Humana?
    private function empresaTieneRRHH($user)
    {
        if (!$user || !$user->empresa_id) {
            return false;
        }
        return DB::table('empresa_modulo')
            ->join('modulos', 'modulos.id', '=', 'empresa_modulo.modulo_id')
            ->where('empresa_modulo.empresa_id', $user->empresa_id)
            ->where('empresa_modulo.activo', true)
            ->where('modulos.paquete', 'rrhh')
            ->exists();
    }

    // Guarda o actualiza las afiliaciones del empleado. El documento es obligatorio para el cambio.
    public function guardarAfiliaciones(Request $request)
    {
        $request->validate([
            'eps' => 'nullable|string|max:255',
            'afondo_pension' => 'nullable|string|max:255',
            'fondo_cesantias' => 'nullable|string|max:255',
            'documento_soporte' => 'nullable|file|max:10240',
        ]);

        $user = $request->user();
        $existe = DB::table('afiliaciones')->where('user_id', $user->id)->first();

        // Con Gestión Humana activa, RRHH aprueba el cambio (estado pendiente).
        // Sin Gestión Humana, el empleado solo puede modificarlas hasta 2 veces en total.
        if (!$this->empresaTieneRRHH($user)) {
            $veces = $existe ? (int) $existe->veces_modificada : 0;
            if ($veces >= 2) {
                return response()->json([
                    'message' => 'Límite alcanzado. Tus afiliaciones solo pueden modificarse 2 veces. Contacta a Gestión Humana o Gerencia para más cambios.',
                ], 403);
            }
        }

        // Subir el documento de soporte si se adjuntó
        $documentoUrl = $existe?->documento_soporte_url ?? null;
        if ($request->hasFile('documento_soporte')) {
            try {
                $uploaded = cloudinary()->upload($request->file('documento_soporte')->getRealPath(), [
                    'folder' => 'gestivapyme/afiliaciones',
                    'resource_type' => 'raw',
                ]);
                $documentoUrl = $uploaded->getSecurePath();
            } catch (\Exception $e) {
                return response()->json(['message' => 'Error al subir el documento: ' . $e->getMessage()], 500);
            }
        }

        $nuevasVeces = ($existe ? (int) $existe->veces_modificada : 0) + 1;

        if ($existe) {
            DB::table('afiliaciones')->where('user_id', $user->id)->update([
                'eps' => $request->eps,
                'afondo_pension' => $request->afondo_pension,
                'fondo_cesantias' => $request->fondo_cesantias,
                'documento_soporte_url' => $documentoUrl,
                'estado' => 'pendiente',
                'veces_modificada' => $nuevasVeces,
                'notas_rechazo' => null,
                'updated_at' => now(),
            ]);
        } else {
            DB::table('afiliaciones')->insert([
                'user_id' => $user->id,
                'eps' => $request->eps,
                'afondo_pension' => $request->afondo_pension,
                'fondo_cesantias' => $request->fondo_cesantias,
                'documento_soporte_url' => $documentoUrl,
                'estado' => 'pendiente',
                'veces_modificada' => $nuevasVeces,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Tus datos de afiliación fueron enviados para aprobación.',
        ]);
    }

    // --- GESTIÓN DE AFILIACIONES POR RRHH ---
    // Obtiene la información de afiliación de un empleado específico
    public function obtenerAfiliacionEmpleado(Request $request, $id)
    {

        $afiliacion = DB::table('afiliaciones')->where('user_id', $id)->first();
        return response()->json(['afiliacion' => $afiliacion]);
    }

    // Aprueba, rechaza y asigna fechas contractuales a las afiliaciones de un empleado
    public function gestionarAfiliacionEmpleado(Request $request, $id)
    {
        $request->validate([
            'eps' => 'nullable|string|max:255',
            'afondo_pension' => 'nullable|string|max:255',
            'fondo_cesantias' => 'nullable|string|max:255',
            'documento_soporte' => 'nullable|file|max:10240',
            'estado' => 'required|in:aprobado,rechazado,pendiente',
            'notas_rechazo' => 'nullable|string',
            'fecha_contratacion' => 'nullable|date',
            'finalizacion_contrato' => 'nullable|date',
            'renovacion_contrato' => 'nullable|date',
        ]);

        $existe = DB::table('afiliaciones')->where('user_id', $id)->first();
        $documentoUrl = $existe?->documento_soporte_url ?? null;
        if ($request->hasFile('documento_soporte')) {
            try {
                $uploaded = cloudinary()->upload($request->file('documento_soporte')->getRealPath(), [
                    'folder' => 'gestivapyme/afiliaciones',
                    'resource_type' => 'raw',
                ]);
                $documentoUrl = $uploaded->getSecurePath();
            } catch (\Exception $e) {
                return response()->json(['message' => 'Error al subir el documento: ' . $e->getMessage()], 500);
            }
        }

        if ($existe) {
            DB::table('afiliaciones')->where('user_id', $id)->update([
                'eps' => $request->eps,
                'afondo_pension' => $request->afondo_pension,
                'fondo_cesantias' => $request->fondo_cesantias,
                'documento_soporte_url' => $documentoUrl,
                'estado' => $request->estado,
                'notas_rechazo' => $request->notas_rechazo,
                'fecha_contratacion' => $request->fecha_contratacion,
                'finalizacion_contrato' => $request->finalizacion_contrato,
                'renovacion_contrato' => $request->renovacion_contrato,
                'updated_at' => now(),
            ]);
        } else {
            DB::table('afiliaciones')->insert([
                'user_id' => $id,
                'eps' => $request->eps,
                'afondo_pension' => $request->afondo_pension,
                'fondo_cesantias' => $request->fondo_cesantias,
                'documento_soporte_url' => $documentoUrl,
                'estado' => $request->estado,
                'notas_rechazo' => $request->notas_rechazo,
                'fecha_contratacion' => $request->fecha_contratacion,
                'finalizacion_contrato' => $request->finalizacion_contrato,
                'renovacion_contrato' => $request->renovacion_contrato,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Afiliación y fechas gestionadas con éxito.'
        ]);
    }
}
