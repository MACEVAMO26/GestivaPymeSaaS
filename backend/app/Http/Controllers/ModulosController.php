<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Empresa;
use App\Models\Modulo;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

class ModulosController extends Controller
{
    // --- GESTIÓN DE MÓDULOS DE EMPRESA ---
    // Obtiene los módulos asignados a una empresa e inicializa los predeterminados si no tiene
    public function getModulosPorEmpresa($empresaId)
    {
        $empresa = Empresa::find($empresaId);
        if (!$empresa) {
            return response()->json(['error' => 'Empresa no encontrada'], 404);
        }

        return $this->obtenerModulosParaEmpresa($empresa);
    }

    public function getMisModulos(Request $request)
    {
        $empresaId = $request->user()->empresa_id;
        if (!$empresaId) {
            return response()->json(['modulos' => []]);
        }
        $empresa = Empresa::find($empresaId);
        if (!$empresa) {
            return response()->json(['modulos' => []]);
        }
        return $this->obtenerModulosParaEmpresa($empresa);
    }

    private function obtenerModulosParaEmpresa(Empresa $empresa)
    {

        if ($empresa->modulos()->count() === 0) {
            $this->inicializarModulosEmpresa($empresa);
        }

        $modulosMaster = Modulo::all();
        
        $modulosEmpresa = DB::table('empresa_modulo')
                            ->where('empresa_id', $empresa->id)
                            ->get()
                            ->keyBy('modulo_id');

        $resultado = [];

        $tipo = $empresa->tipo_empresa;
        $tarifas = $empresa->tarifasCatalogo()->pluck('tarifas_catalogo.id')->toArray();

        $paquetesPermitidos = ['base'];
        if ($tipo === 'Ventas' || $tipo === 'Ventas y Servicios') $paquetesPermitidos[] = 'ventas';
        if ($tipo === 'Servicios' || $tipo === 'Ventas y Servicios') $paquetesPermitidos[] = 'servicios';
        
        if (in_array('modulo_rrhh', $tarifas)) $paquetesPermitidos[] = 'rrhh';
        if (in_array('modulo_finanzas', $tarifas)) $paquetesPermitidos[] = 'finanzas';
        
        if (in_array('addon_factura', $tarifas) || in_array('addon_contable', $tarifas)) {
            $paquetesPermitidos[] = 'addons';
        }

        foreach ($modulosMaster as $modulo) {
            $paquete = $modulo->paquete;
            if (!isset($resultado[$paquete])) {
                $resultado[$paquete] = [];
            }
            
            $asignado = in_array($paquete, $paquetesPermitidos);
            $enBD = $modulosEmpresa->has($modulo->id);
            $activoParaEmpresa = ($asignado && $enBD) ? (bool) $modulosEmpresa[$modulo->id]->activo : false;

            $resultado[$paquete][] = [
                'id' => $modulo->id,
                'nombre' => $modulo->nombre,
                'activo' => $activoParaEmpresa,
                'asignado' => $asignado
            ];
        }

        return response()->json(['modulos' => $resultado]);
    }

    private function inicializarModulosEmpresa(Empresa $empresa)
    {
        $modulosAsignar = [];
        $tipo = $empresa->tipo_empresa; // 'Ventas', 'Servicios', 'Ventas y Servicios'

        $modulosTransversales = Modulo::whereIn('paquete', ['finanzas', 'rrhh'])->pluck('id')->toArray();
        $modulosVentas = Modulo::where('paquete', 'ventas')->pluck('id')->toArray();
        $modulosServicios = Modulo::where('paquete', 'servicios')->pluck('id')->toArray();

        $modulosAsignar = array_merge($modulosAsignar, $modulosTransversales);

        if ($tipo === 'Ventas' || $tipo === 'Ventas y Servicios') {
            $modulosAsignar = array_merge($modulosAsignar, $modulosVentas);
        }
        
        if ($tipo === 'Servicios' || $tipo === 'Ventas y Servicios') {
            $modulosAsignar = array_merge($modulosAsignar, $modulosServicios);
        }

        $syncData = [];
        foreach ($modulosAsignar as $moduloId) {
            $syncData[$moduloId] = ['activo' => true];

        }

        $empresa->modulos()->sync($syncData);
    }

    public function sincronizarModulosPorSuscripcion(Empresa $empresa)
    {
        $tipo = $empresa->tipo_empresa;
        $tarifas = $empresa->tarifasCatalogo()->pluck('tarifas_catalogo.id')->toArray();

        $paquetesPermitidos = ['base'];
        if ($tipo === 'Ventas' || $tipo === 'Ventas y Servicios') $paquetesPermitidos[] = 'ventas';
        if ($tipo === 'Servicios' || $tipo === 'Ventas y Servicios') $paquetesPermitidos[] = 'servicios';
        
        // Módulos Especiales (Adicionales)
        if (in_array('modulo_rrhh', $tarifas)) $paquetesPermitidos[] = 'rrhh';
        if (in_array('modulo_finanzas', $tarifas)) $paquetesPermitidos[] = 'finanzas';
        
        // Addons
        if (in_array('addon_factura', $tarifas) || in_array('addon_contable', $tarifas)) {
            $paquetesPermitidos[] = 'addons';
        }

        $modulosMaster = Modulo::all();

        foreach ($modulosMaster as $modulo) {
            $permitido = in_array($modulo->paquete, $paquetesPermitidos);
            
            $pivot = DB::table('empresa_modulo')
                       ->where('empresa_id', $empresa->id)
                       ->where('modulo_id', $modulo->id)
                       ->first();

            if ($permitido) {
                // Si el módulo está cubierto por el pago y no existe en la BD, se asigna y activa
                if (!$pivot) {
                    DB::table('empresa_modulo')->insert([
                        'empresa_id' => $empresa->id,
                        'modulo_id' => $modulo->id,
                        'activo' => true,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);

                }
                // Si ya existe, NO se sobrescribe 'activo' para respetar la configuración manual del SaaS Admin
            } else {
                // Si NO está cubierto por el pago y está activo, se APAGA forzosamente
                if ($pivot && $pivot->activo) {
                    DB::table('empresa_modulo')
                        ->where('empresa_id', $empresa->id)
                        ->where('modulo_id', $modulo->id)
                        ->update(['activo' => false, 'updated_at' => now()]);
                }
            }
        }
    }

    public function toggleModuloEmpresa(Request $request, $empresaId, $moduloId)
    {
        $empresa = Empresa::find($empresaId);
        if (!$empresa) {
            return response()->json(['error' => 'Empresa no encontrada'], 404);
        }

        if (!Modulo::where('id', $moduloId)->exists()) {
            return response()->json(['error' => 'Módulo no encontrado'], 404);
        }

        $moduloPivot = DB::table('empresa_modulo')
                         ->where('empresa_id', $empresaId)
                         ->where('modulo_id', $moduloId)
                         ->first();

        if ($moduloPivot) {
            $nuevoEstado = !$moduloPivot->activo;
            DB::table('empresa_modulo')
              ->where('empresa_id', $empresaId)
              ->where('modulo_id', $moduloId)
              ->update(['activo' => $nuevoEstado, 'updated_at' => now()]);
            
            if ($nuevoEstado) {

            }
            
            return response()->json(['message' => 'Módulo actualizado', 'activo' => $nuevoEstado]);
        } else {
            // Asigna y activa el módulo simulando la compra de un addon
            DB::table('empresa_modulo')->insert([
                'empresa_id' => $empresaId,
                'modulo_id' => $moduloId,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json(['message' => 'Módulo asignado y activado', 'activo' => true]);
        }
    }

    public function updatePaqueteEmpresa(Request $request, $empresaId)
    {
        $empresa = Empresa::find($empresaId);
        if (!$empresa) {
            return response()->json(['error' => 'Empresa no encontrada'], 404);
        }

        $modulosState = $request->input('modulos', []);

        foreach ($modulosState as $mod) {
            $moduloId = $mod['id'];
            $activo = $mod['activo'];

            if (!Modulo::where('id', $moduloId)->exists()) {
                continue;
            }

            $moduloPivot = DB::table('empresa_modulo')
                             ->where('empresa_id', $empresaId)
                             ->where('modulo_id', $moduloId)
                             ->first();

            if ($moduloPivot) {
                DB::table('empresa_modulo')
                  ->where('empresa_id', $empresaId)
                  ->where('modulo_id', $moduloId)
                  ->update(['activo' => $activo, 'updated_at' => now()]);
                  
                if ($activo) {

                }
            } else {
                DB::table('empresa_modulo')->insert([
                    'empresa_id' => $empresaId,
                    'modulo_id' => $moduloId,
                    'activo' => $activo,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                if ($activo) {

                }
            }
        }

        return response()->json(['message' => 'Paquete actualizado correctamente']);
    }

    // --- GESTIÓN GLOBAL DE MÓDULOS ---
    // Registra un nuevo módulo global en el sistema
    public function store(Request $request)
    {
        $request->validate([
            'id' => 'required|string|unique:modulos,id',
            'nombre' => 'required|string',
            'paquete' => 'required|string'
        ]);

        $modulo = Modulo::create([
            'id' => $request->id,
            'nombre' => $request->nombre,
            'paquete' => $request->paquete,
            'activo' => false
        ]);

        return response()->json(['message' => 'Módulo creado', 'modulo' => $modulo]);
    }

    public function update(Request $request, $id)
    {
        $modulo = Modulo::find($id);
        if (!$modulo) {
            return response()->json(['error' => 'Módulo no encontrado'], 404);
        }

        $request->validate([
            'nombre' => 'required|string'
        ]);

        $modulo->nombre = $request->nombre;
        $modulo->save();

        return response()->json(['message' => 'Módulo actualizado', 'modulo' => $modulo]);
    }

    public function destroy($id)
    {
        $modulo = Modulo::find($id);
        if (!$modulo) {
            return response()->json(['error' => 'Módulo no encontrado'], 404);
        }

        // Elimina las asignaciones del módulo en todas las empresas antes de borrarlo
        DB::table('empresa_modulo')->where('modulo_id', $id)->delete();
        $modulo->delete();

        return response()->json(['message' => 'Módulo eliminado correctamente']);
    }
}
