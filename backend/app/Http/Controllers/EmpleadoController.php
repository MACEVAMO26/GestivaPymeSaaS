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
            'salario' => 'nullable|numeric'
        ]);

        $empresaId = auth()->user()->empresa_id;
        
        $usuario = User::where('id', $usuarioId)->where('empresa_id', $empresaId)->firstOrFail();

        if ($usuario->perfil_formalizado) {
            return response()->json(['error' => 'El usuario ya está formalizado'], 400);
        }

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
            'estado' => 'activo'
        ]);

        // 2. Obtener el Cargo para heredar sus permisos (rol)
        $cargo = \App\Models\Cargo::findOrFail($request->cargo_id);

        // 3. Actualizar el usuario para desbloquearlo y asignarle su nivel de seguridad
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
        $empresaId = auth()->user()->empresa_id;
        $empleado = Empleado::with(['usuario.empresa', 'cargo'])->where('id', $id)->where('empresa_id', $empresaId)->firstOrFail();

        if (!$empleado->usuario) {
            return response()->json(['message' => 'Empleado sin usuario asociado'], 404);
        }

        $data = [
            'nombre' => $empleado->usuario->nombres . ' ' . $empleado->usuario->apellidos,
            'cedula' => $empleado->usuario->documento,
            'cargo' => $empleado->cargo ? $empleado->cargo->nombre : 'Sin cargo especificado',
            'salario' => $empleado->salario ?? 0,
            'fecha_ingreso' => $empleado->fecha_contratacion ?? $empleado->created_at->format('Y-m-d'),
            'tipo_contrato' => $empleado->tipo_contrato ?? 'Término Indefinido',
            'empresa' => $empleado->usuario->empresa ? $empleado->usuario->empresa->razon_social : 'GestivaPyme',
            'nit' => $empleado->usuario->empresa ? $empleado->usuario->empresa->nit : 'N/A',
            'fecha_actual' => now()->format('Y-m-d'),
        ];

        $pdf = Pdf::loadView('pdfs.certificado_laboral', $data);

        return $pdf->download('certificado_laboral_' . $empleado->usuario->documento . '.pdf');
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

    // Actualiza el perfil laboral y los módulos permitidos de un empleado formalizado
    public function update(Request $request, $id)
    {
        $request->validate([
            'sede_id' => 'required|integer',
            'area_id' => 'required|integer',
            'cargo_id' => 'required|integer',
            'tipo_contrato' => 'required|string',
            'fecha_contratacion' => 'required|date',
            'salario' => 'nullable|numeric',
            'modulos_permitidos' => 'nullable|array'
        ]);

        $empresaId = auth()->user()->empresa_id;
        $empleado = Empleado::where('id', $id)->where('empresa_id', $empresaId)->firstOrFail();

        $empleado->update([
            'sede_id' => $request->sede_id,
            'area_id' => $request->area_id,
            'cargo_id' => $request->cargo_id,
            'tipo_contrato' => $request->tipo_contrato,
            'fecha_contratacion' => $request->fecha_contratacion,
            'salario' => $request->salario,
            'modulos_permitidos' => $request->modulos_permitidos
        ]);

        // Sincronizar el rol correspondiente al cargo seleccionado en el usuario
        $cargo = \App\Models\Cargo::find($request->cargo_id);
        if ($cargo && $empleado->usuario) {
            $empleado->usuario->rol_id = $cargo->rol_id;
            $empleado->usuario->save();
        }

        return response()->json([
            'message' => 'Perfil del empleado y permisos de módulos actualizados exitosamente.',
            'empleado' => $empleado->load(['usuario', 'area', 'cargo'])
        ]);
    }
}
