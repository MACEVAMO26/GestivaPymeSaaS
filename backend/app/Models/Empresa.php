<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Empresa extends Model
{
    use HasFactory;

    // Bloque de definición de tabla en la base de datos
    protected $table = 'empresa';

    // Bloque de configuración de marcas de tiempo del modelo
    public $timestamps = false;

    // Bloque de atributos asignables en masa
    protected $fillable = [
        'razon_social',
        'dominio',
        'nit',
        'tipo_empresa',
        'direccion',
        'telefono',
        'email',
        'logo_url',
        'color_primario',
        'color_secundario',
        'color_fondo',
        'color_texto',
        'ciudad',
        'activo',
        'estado_pago',
        'inactive_at',
        'plan_suscripcion',
        'monto_mensual',
        'fecha_proximo_pago',
        'last_activity_at',
        'estado_servidor',
        'ultimo_ping',
        'fecha_inscripcion',
        'renovaciones',
        'descuento',
        'periodo',
        'descuentos_aplicados',
        'cargos_extra',
        'addons_personalizados',
        'arl',
        'caja_compensacion',
        'contrato_id',
        'fecha_firma',
        'firma_gerente_url',
        'contrato_pdf_url',
        'ia_byok_activo',
        'ia_byok_proveedor',
        'ia_byok_key',
        'ia_byok_modelo',
        'ia_byok_modo',
        'ia_byok_tareas',
        'ia_fuente',
    ];

    // Bloque de casteo y conversión de tipos de atributos
    protected $casts = [
        'descuentos_aplicados' => 'array',
        'cargos_extra'         => 'array',
        'addons_personalizados'=> 'array',
        'fecha_firma'          => 'datetime',
        'ia_byok_activo'       => 'boolean',
        'ia_byok_tareas'       => 'array',
    ];

    // Bloque para obtener la relación con el contrato SaaS firmado
    public function contratoSaas()
    {
        return $this->belongsTo(SaasContrato::class, 'contrato_id');
    }

    // Bloque para obtener las tarifas del catálogo asociadas a la empresa
    public function tarifasCatalogo()
    {
        return $this->belongsToMany(TarifaCatalogo::class, 'empresa_tarifas', 'empresa_id', 'tarifa_id')
                    ->withPivot('cantidad', 'valor_aplicado')
                    ->withTimestamps();
    }

    // Bloque para obtener los módulos contratados y activos de la empresa
    public function modulos()
    {
        return $this->belongsToMany(Modulo::class, 'empresa_modulo')
                    ->withPivot('activo')
                    ->withTimestamps();
    }

    // Bloque de atributos calculados que se agregan al serializar el modelo
    protected $appends = ['meses_activos', 'ganancia_total'];

    // Bloque accesor para calcular el total de meses activos de la suscripción
    public function getMesesActivosAttribute()
    {
        return $this->renovaciones + 1;
    }

    // Bloque accesor para calcular la ganancia monetaria total generada por la empresa
    public function getGananciaTotalAttribute()
    {
        return $this->meses_activos * $this->monto_mensual;
    }
}
