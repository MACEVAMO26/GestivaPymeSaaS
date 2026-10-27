<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AutogestionController extends Controller
{
    // Bloque para obtener las estadísticas generales de autogestión del usuario
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

    // Bloque para consultar los datos de afiliación y seguridad social del usuario autenticado
    
    public function misAfiliaciones(Request $request)
    {
        $user = $request->user();
        $empleado = \App\Models\Empleado::where('usuario_id', $user->id)->first();
        $afiliacion = DB::table('afiliaciones')->where('user_id', $user->id)->first();

        // Bloque para leer la configuración de seguridad social de la empresa
        $empresa = DB::table('empresa')->where('id', $user->empresa_id)->first();

        // Bloque para priorizar datos de formalización del empleado
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

    // Bloque para verificar si la empresa tiene activo el módulo de Gestión Humana
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

    // Bloque para guardar o actualizar las afiliaciones del empleado con documento de soporte
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

        // Bloque de validación de límite de modificaciones según módulo de Gestión Humana
        if (!$this->empresaTieneRRHH($user)) {
            $veces = $existe ? (int) $existe->veces_modificada : 0;
            if ($veces >= 2) {
                return response()->json([
                    'message' => 'Límite alcanzado. Tus afiliaciones solo pueden modificarse 2 veces. Contacta a Gestión Humana o Gerencia para más cambios.',
                ], 403);
            }
        }

        // Bloque para subir el documento de soporte a Cloudinary
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

    // Bloque para obtener la información de afiliación de un empleado específico
    public function obtenerAfiliacionEmpleado(Request $request, $id)
    {

        $afiliacion = DB::table('afiliaciones')->where('user_id', $id)->first();
        return response()->json(['afiliacion' => $afiliacion]);
    }

    // Bloque para aprobar, rechazar o actualizar fechas contractuales de afiliación de un empleado
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
            'finalizacion_contrato' => 'nullable|date|after_or_equal:fecha_contratacion',
            'renovacion_contrato' => 'nullable|date|after_or_equal:fecha_contratacion',
        ], [
            'finalizacion_contrato.after_or_equal' => 'La fecha de finalización debe ser igual o posterior a la de contratación.',
            'renovacion_contrato.after_or_equal' => 'La fecha de renovación debe ser igual o posterior a la de contratación.',
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
