<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ModuloSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $modulos = [
            // Ventas
            ['id' => 'v_pos', 'nombre' => 'Ventas', 'paquete' => 'ventas'],
            ['id' => 'v_inv', 'nombre' => 'Inventario', 'paquete' => 'ventas'],
            ['id' => 'v_cxc', 'nombre' => 'Clientes', 'paquete' => 'ventas'],
            ['id' => 'v_rep', 'nombre' => 'Compras', 'paquete' => 'ventas'],
            ['id' => 'v_prov', 'nombre' => 'Proveedores', 'paquete' => 'ventas'],
            
            // Servicios
            ['id' => 's_age', 'nombre' => 'Agenda y Calendario', 'paquete' => 'servicios'],
            ['id' => 's_crm', 'nombre' => 'CRM (Gestión de Clientes)', 'paquete' => 'servicios'],
            ['id' => 's_cat', 'nombre' => 'Catálogo de Servicios', 'paquete' => 'servicios'],
            ['id' => 's_ope', 'nombre' => 'Gestión de Operarios', 'paquete' => 'servicios'],
            ['id' => 's_rep', 'nombre' => 'Reportes de Servicios', 'paquete' => 'servicios'],
            
            // Finanzas / Caja (Transversal)
            ['id' => 'f_caja', 'nombre' => 'Caja y Pre-facturación', 'paquete' => 'finanzas'],
            
            // RRHH (Transversal)
            ['id' => 'r_tur', 'nombre' => 'Horarios y Turnos', 'paquete' => 'rrhh'],
            ['id' => 'r_aus', 'nombre' => 'Control de Horas Extras y Ausencias', 'paquete' => 'rrhh'],
            ['id' => 'r_vac', 'nombre' => 'Gestión de Vacaciones', 'paquete' => 'rrhh'],
            
            // Add-ons
            ['id' => 'a_contable', 'nombre' => 'Conector Contable', 'paquete' => 'addons'],
        ];

        foreach ($modulos as $mod) {
            \App\Models\Modulo::updateOrCreate(
                ['id' => $mod['id']],
                [
                    'nombre' => $mod['nombre'],
                    'paquete' => $mod['paquete'],
                    'activo' => true
                ]
            );
        }
    }
}
