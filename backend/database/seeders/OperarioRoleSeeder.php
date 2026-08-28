<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OperarioRoleSeeder extends Seeder
{
    /**
     * Crea el rol y cargo "Operativo" en todas las empresas existentes
     * que aún no lo tengan, con permisos base de solo lectura.
     */
    public function run(): void
    {
        $empresas = \App\Models\Empresa::all();

        foreach ($empresas as $empresa) {
            $rol = \App\Models\Role::firstOrCreate(
                ['empresa_id' => $empresa->id, 'nombre' => 'Operativo'],
                [
                    'descripcion' => 'Personal operativo. No inactiva ni elimina; solicita al Jefe de Área.',
                    'activo' => 1,
                ]
            );

            \App\Models\Cargo::firstOrCreate(
                ['empresa_id' => $empresa->id, 'nombre' => 'Operativo'],
                [
                    'rol_id' => $rol->id,
                    'descripcion' => 'Ejecuta tareas operativas del negocio',
                    'activo' => 1,
                ]
            );

            foreach (DB::table('modulos')->pluck('id') as $modId) {
                \App\Models\Permiso::firstOrCreate(
                    ['rol_id' => $rol->id, 'modulo_id' => $modId],
                    ['puede_ver' => 1, 'puede_crear' => 0, 'puede_editar' => 0, 'puede_inactivar' => 0]
                );
            }

            $this->command->info("Operario creado para empresa {$empresa->id}");
        }
    }
}
