<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Empleado;
use App\Models\Notificacion;
use App\Models\Role;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class EmpleadoController extends Controller
{
    // Trae la lista de usuarios "cáscara" pendientes de formalización
    public function pendientes()
    {
        $empresaId = auth()->user()->empresa_id;
        $pendientes = User::where('empresa_id', $empresaId)
                          ->where('perfil_formalizado', false)
                          ->get();
                          
        return response()->json($pendientes);
    }

    // Trae la lista de empleados ya formalizados
    public function index()
    {
        $empresaId = auth()->user()->empresa_id;
        // Cargamos la relación con usuario para traer nombre, documento, etc.
        $empleados = Empleado::with(['usuario', 'area', 'cargo'])
                             ->where('empresa_id', $empresaId)
                             ->get();
                             
        return response()->json($empleados);
    }

    // Formaliza un usuario "cáscara", creando su perfil de empleado y otorgando acceso
    public function formalizar(Request $request, $usuarioId)
    {
        $request->validate([
            'sede_id' => 'required|integer|exists:sedes,id',
            'area_id' => 'required|integer|exists:areas,id',
            'cargo_id' => 'required|integer|exists:cargos,id',
            'tipo_contrato' => 'required|string',
            'fecha_contratacion' => 'required|date',
            'fecha_fin_contrato' => 'nullable|date|after_or_equal:fecha_contratacion',
            'salario' => 'nullable|numeric',
            'eps' => 'nullable|string|max:100',
            'fondo_pension' => 'nullable|string|max:100',
            'fondo_cesantias' => 'nullable|string|max:100',
            'arl' => 'nullable|string|max:100',
            'caja_compensacion' => 'nullable|string|max:100'
        ]);

        $empresaId = auth()->user()->empresa_id;
        $usuario = User::where('id', $usuarioId)->where('empresa_id', $empresaId)->firstOrFail();

        if ($usuario->perfil_formalizado) {
            return response()->json(['error' => 'El usuario ya está formalizado'], 400);
        }

        $empresa = \App\Models\Empresa::find($empresaId);
        $arl = $request->arl ?: ($empresa->arl ?? 'SURA');
        $caja = $request->caja_compensacion ?: ($empresa->caja_compensacion ?? 'Compensar');

        // 1. Crear el registro en empleados
        $empleado = Empleado::create([
            'usuario_id' => $usuario->id,
            'empresa_id' => $empresaId,
            'sede_id' => $request->sede_id,
            'area_id' => $request->area_id,
            'cargo_id' => $request->cargo_id,
            'tipo_contrato' => $request->tipo_contrato,
            'fecha_contratacion' => $request->fecha_contratacion,
            'fecha_fin_contrato' => $request->fecha_fin_contrato,
            'salario' => $request->salario,
            'eps' => $request->eps,
            'fondo_pension' => $request->fondo_pension,
            'fondo_cesantias' => $request->fondo_cesantias,
            'arl' => $arl,
            'caja_compensacion' => $caja,
            'estado' => 'activo'
        ]);

        // 2. Sincronizar en tabla afiliaciones para autogestión
        if ($request->eps || $request->fondo_pension || $arl) {
            DB::table('afiliaciones')->updateOrInsert(
                ['user_id' => $usuario->id],
                [
                    'eps' => $request->eps,
                    'arl' => $arl,
                    'afondo_pension' => $request->fondo_pension,
                    'fondo_cesantias' => $request->fondo_cesantias,
                    'estado' => 'aprobado',
                    'updated_at' => now(),
                    'created_at' => now()
                ]
            );
        }

        // 3. Obtener el Cargo para heredar sus permisos (rol)
        $cargo = \App\Models\Cargo::findOrFail($request->cargo_id);

        // 4. Actualizar el usuario para desbloquearlo y asignarle su nivel de seguridad
        $usuario->perfil_formalizado = true;
        $usuario->rol_id = $cargo->rol_id;
        $usuario->save();

        return response()->json([
            'message' => 'Empleado formalizado exitosamente. Acceso concedido al sistema.',
            'empleado' => $empleado
        ]);
    }

    // Actualiza los datos del contrato de un empleado (tipo, fechas, salario)
    public function updateContrato(Request $request, $id)
    {
        $request->validate([
            'tipo_contrato' => 'required|string',
            'fecha_contratacion' => 'required|date',
            'fecha_fin_contrato' => 'nullable|date|after_or_equal:fecha_contratacion',
            'salario' => 'nullable|numeric'
        ]);

        $empresaId = auth()->user()->empresa_id;
        $empleado = Empleado::where('id', $id)->where('empresa_id', $empresaId)->firstOrFail();

        $empleado->update([
            'tipo_contrato' => $request->tipo_contrato,
            'fecha_contratacion' => $request->fecha_contratacion,
            'fecha_fin_contrato' => $request->fecha_fin_contrato,
            'salario' => $request->salario,
        ]);

        return response()->json(['message' => 'Contrato actualizado correctamente', 'empleado' => $empleado]);
    }

    // Solicita la baja de un empleado (GH -> Gerente)
    public function solicitarBaja(Request $request, $id)
    {
        $request->validate([
            'motivo' => 'required|string|max:500'
        ]);

        $empresaId = auth()->user()->empresa_id;
        
        $empleado = Empleado::where('id', $id)->where('empresa_id', $empresaId)->firstOrFail();

        if ($empleado->baja_solicitada) {
            return response()->json(['error' => 'Ya existe una solicitud de baja para este empleado.'], 400);
        }

        // Marcar como solicitada
        $empleado->baja_solicitada = true;
        $empleado->save();

        // Buscar al gerente de la empresa para notificarle
        $gerenteRole = Role::where('nombre', 'Gerente General')->first();
        if ($gerenteRole) {
            $gerentes = User::where('empresa_id', $empresaId)->where('rol_id', $gerenteRole->id)->get();
            foreach ($gerentes as $gerente) {
                Notificacion::create([
                    'usuario_id' => $gerente->id,
                    'titulo' => 'Solicitud de Baja de Empleado',
                    'descripcion' => 'Gestión Humana ha solicitado la inactivación del empleado ' . $empleado->usuario->nombres . ' ' . $empleado->usuario->apellidos . '. Motivo: ' . $request->motivo,
                    'leida' => false
                ]);
            }
        }

        return response()->json(['message' => 'Solicitud de baja enviada al Gerente exitosamente.']);
    }

    public function generarCertificado($id)
    {
        $user = auth()->user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $empresaId = $user->empresa_id;

        // Buscar empleado por ID o por usuario_id
        $empleado = null;
        if ($id === 'me' || $id == $user->id) {
            $empleado = Empleado::with(['usuario.empresa', 'cargo', 'area'])
                ->where('usuario_id', $user->id)
                ->first();
        }

        if (!$empleado) {
            $empleado = Empleado::with(['usuario.empresa', 'cargo', 'area'])
                ->where('id', $id)
                ->where('empresa_id', $empresaId)
                ->first();
        }

        if (!$empleado) {
            $empleado = Empleado::with(['usuario.empresa', 'cargo', 'area'])
                ->where('usuario_id', $id)
                ->where('empresa_id', $empresaId)
                ->first();
        }

        if (!$empleado) {
            return response()->json(['message' => 'No se encontró el registro laboral para este usuario/empleado'], 404);
        }

        $usuario = $empleado->usuario ?? $user;
        $empresa = $usuario->empresa ?? \App\Models\Empresa::find($empresaId);

        $empresaNombre = $empresa ? ($empresa->nombre_comercial ?? $empresa->razon_social ?? $empresa->nombre) : 'Techventas y Soluciones S.A.S.';
        $empresaNit = $empresa ? ($empresa->nit ?? $empresa->documento ?? '901.834.192-4') : '901.834.192-4';

        // Formato de fechas en español
        $meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        $fechaIngresoCarbon = $empleado->fecha_contratacion ? \Carbon\Carbon::parse($empleado->fecha_contratacion) : ($empleado->created_at ?? now());
        $fechaIngresoTexto = $fechaIngresoCarbon->day . ' de ' . $meses[$fechaIngresoCarbon->month] . ' de ' . $fechaIngresoCarbon->year;

        $now = now();
        $fechaActualTexto = $now->day . ' de ' . $meses[$now->month] . ' de ' . $now->year;

        $data = [
            'nombre' => trim(($usuario->nombres ?? '') . ' ' . ($usuario->apellidos ?? '')) ?: ($usuario->name ?? 'Colaborador'),
            'cedula' => $usuario->documento ?? 'No registrada',
            'cargo' => $empleado->cargo ? $empleado->cargo->nombre : ($usuario->cargo?->nombre ?? 'Especialista en Soluciones TI'),
            'area' => $empleado->area ? $empleado->area->nombre : 'Tecnología y Operaciones',
            'salario' => $empleado->salario ? number_format($empleado->salario, 0, ',', '.') : '3.800.000',
            'fecha_ingreso' => $fechaIngresoTexto,
            'tipo_contrato' => $empleado->tipo_contrato ?? 'Término Indefinido',
            'empresa' => $empresaNombre,
            'nit' => $empresaNit,
            'fecha_actual' => $fechaActualTexto,
            'ciudad' => 'Bogotá D.C.',
            'codigo_verificacion' => strtoupper(substr(md5($empleado->id . '-' . ($usuario->documento ?? '0') . '-gestivapyme'), 0, 10))
        ];

        $pdf = Pdf::loadView('pdfs.certificado_laboral', $data);

        return $pdf->download('Certificado_Laboral_' . ($usuario->documento ?? $usuario->id) . '.pdf');
    }

    // Aprueba la baja (Gerente -> Empleado)
    public function aprobarBaja(Request $request, $id)
    {
        $empresaId = auth()->user()->empresa_id;
        
        $empleado = Empleado::where('id', $id)->where('empresa_id', $empresaId)->firstOrFail();
        $usuario = $empleado->usuario;

        // Inactivar empleado
        $empleado->estado = 'inactivo';
        $empleado->baja_solicitada = false;
        $empleado->save();

        // Inactivar usuario
        if ($usuario) {
            $usuario->activo = false;
            $usuario->save();
        }

        return response()->json(['message' => 'El empleado ha sido inactivado correctamente.']);
    }

    // Actualiza el perfil laboral, seguridad social y los módulos permitidos de un empleado formalizado
    public function update(Request $request, $id)
    {
        $request->validate([
            'sede_id' => 'required|integer',
            'area_id' => 'required|integer',
            'cargo_id' => 'required|integer',
            'tipo_contrato' => 'required|string',
            'fecha_contratacion' => 'required|date',
            'salario' => 'nullable|numeric',
            'modulos_permitidos' => 'nullable|array',
            'eps' => 'nullable|string|max:100',
            'fondo_pension' => 'nullable|string|max:100',
            'fondo_cesantias' => 'nullable|string|max:100',
            'arl' => 'nullable|string|max:100',
            'caja_compensacion' => 'nullable|string|max:100',
            'estado' => 'nullable|string|in:activo,inactivo,en vacaciones,permiso,incapacitado,licencia'
        ]);

        $empresaId = auth()->user()->empresa_id;
        $empleado = Empleado::where('id', $id)->where('empresa_id', $empresaId)->firstOrFail();

        $updateData = [
            'sede_id' => $request->sede_id,
            'area_id' => $request->area_id,
            'cargo_id' => $request->cargo_id,
            'tipo_contrato' => $request->tipo_contrato,
            'fecha_contratacion' => $request->fecha_contratacion,
            'salario' => $request->salario,
            'modulos_permitidos' => $request->modulos_permitidos
        ];

        if ($request->has('eps')) $updateData['eps'] = $request->eps;
        if ($request->has('fondo_pension')) $updateData['fondo_pension'] = $request->fondo_pension;
        if ($request->has('fondo_cesantias')) $updateData['fondo_cesantias'] = $request->fondo_cesantias;
        if ($request->has('arl')) $updateData['arl'] = $request->arl;
        if ($request->has('caja_compensacion')) $updateData['caja_compensacion'] = $request->caja_compensacion;
        if ($request->has('estado') && !empty($request->estado)) $updateData['estado'] = $request->estado;

        $empleado->update($updateData);

        // Sincronizar con tabla afiliaciones para reflejo instantáneo en Autogestión
        if ($empleado->usuario_id) {
            $afilUpdates = ['updated_at' => now()];
            if (array_key_exists('eps', $updateData)) $afilUpdates['eps'] = $updateData['eps'];
            if (array_key_exists('fondo_pension', $updateData)) $afilUpdates['afondo_pension'] = $updateData['fondo_pension'];
            if (array_key_exists('fondo_cesantias', $updateData)) $afilUpdates['fondo_cesantias'] = $updateData['fondo_cesantias'];
            if (array_key_exists('arl', $updateData)) $afilUpdates['arl'] = $updateData['arl'];

            DB::table('afiliaciones')->updateOrInsert(
                ['user_id' => $empleado->usuario_id],
                $afilUpdates
            );
        }

        // Sincronizar el rol correspondiente al cargo seleccionado en el usuario
        $cargo = \App\Models\Cargo::find($request->cargo_id);
        if ($cargo && $empleado->usuario) {
            $empleado->usuario->rol_id = $cargo->rol_id;
            if ($request->has('estado')) {
                $empleado->usuario->activo = ($request->estado !== 'inactivo');
            }
            $empleado->usuario->save();
        }

        return response()->json([
            'message' => 'Perfil del empleado, seguridad social y permisos actualizados exitosamente.',
            'empleado' => $empleado->load(['usuario', 'area', 'cargo'])
        ]);
    }
}
