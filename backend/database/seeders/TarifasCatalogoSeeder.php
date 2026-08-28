<?php
 
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
 
class TarifasCatalogoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tarifas = [
            // Planes Base
            [
                'id' => 'plan_basico',
                'nombre' => 'Plan Emprendedor',
                'tipo' => 'plan',
                'mecanismo' => 'fijo',
                'valor' => 70000.00,
                'activo' => true
            ],
            [
                'id' => 'plan_profesional',
                'nombre' => 'Plan Pyme',
                'tipo' => 'plan',
                'mecanismo' => 'fijo',
                'valor' => 150000.00,
                'activo' => true
            ],
            [
                'id' => 'plan_empresarial',
                'nombre' => 'Plan Empresarial',
                'tipo' => 'plan',
                'mecanismo' => 'fijo',
                'valor' => 280000.00,
                'activo' => true
            ],
            
            // Inteligencia Artificial (Gemini Flash)
            [
                'id' => 'ia_simple',
                'nombre' => 'IA Gemini - Modo Simple (por usuario)',
                'tipo' => 'ia_plan',
                'mecanismo' => 'por_usuario',
                'valor' => 6000.00,
                'activo' => true
            ],
            [
                'id' => 'ia_avanzada',
                'nombre' => 'IA Gemini - Modo Avanzado (por usuario)',
                'tipo' => 'ia_plan',
                'mecanismo' => 'por_usuario',
                'valor' => 18000.00,
                'activo' => true
            ],
            
            // Módulos Adicionales (Transversales)
            [
                'id' => 'modulo_rrhh',
                'nombre' => 'Gestión Humana y Turnos (RRHH)',
                'tipo' => 'modulo_adicional',
                'mecanismo' => 'fijo',
                'valor' => 20000.00,
                'activo' => true
            ],
            [
                'id' => 'modulo_finanzas',
                'nombre' => 'Caja y Pre-facturación (Finanzas)',
                'tipo' => 'modulo_adicional',
                'mecanismo' => 'fijo',
                'valor' => 20000.00,
                'activo' => true
            ],
            
            // Conectores / Addons
            [
                'id' => 'addon_whatsapp',
                'nombre' => 'Conector WhatsApp Business API',
                'tipo' => 'addon',
                'mecanismo' => 'fijo',
                'valor' => 10000.00,
                'activo' => true
            ],
            [
                'id' => 'addon_factura',
                'nombre' => 'Conector Facturación Electrónica DIAN',
                'tipo' => 'addon',
                'mecanismo' => 'fijo',
                'valor' => 15000.00,
                'activo' => true
            ],
            [
                'id' => 'addon_byok_ia',
                'nombre' => 'Conector API de IA Propia (BYOK)',
                'tipo' => 'addon',
                'mecanismo' => 'fijo',
                'valor' => 25000.00,
                'activo' => true
            ],
            
            // Descuentos
            [
                'id' => 'descuento_referido',
                'nombre' => 'Descuento Referido 10%',
                'tipo' => 'descuento',
                'mecanismo' => 'porcentaje',
                'valor' => 10.00,
                'activo' => true
            ],
            [
                'id' => 'descuento_mes_gratis',
                'nombre' => 'Descuento Un Mes Gratis (8.33%)',
                'tipo' => 'descuento',
                'mecanismo' => 'porcentaje',
                'valor' => 8.33,
                'activo' => true
            ],
        ];

        foreach ($tarifas as $tarifa) {
            DB::table('tarifas_catalogo')->updateOrInsert(
                ['id' => $tarifa['id']],
                $tarifa
            );
        }
    }
}
