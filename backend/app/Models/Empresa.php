<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Empresa extends Model
{
    use HasFactory;

    // --- TABLA ---

    protected $table = 'empresa';

    // --- TIMESTAMPS ---
    
    public $timestamps = false;

    // --- CAMPOS ---
    
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
        'ia_byok_modelo'
    ];

    protected $casts = [
        'descuentos_aplicados' => 'array',
        'cargos_extra' => 'array',
        'addons_personalizados' => 'array',
        'fecha_firma' => 'datetime',
        'ia_byok_activo' => 'boolean'
    ];

    public function contratoSaas()
    {
        return $this->belongsTo(SaasContrato::class, 'contrato_id');
    }

    public function tarifasCatalogo()
    {
        return $this->belongsToMany(TarifaCatalogo::class, 'empresa_tarifas', 'empresa_id', 'tarifa_id')
                    ->withPivot('cantidad', 'valor_aplicado')
                    ->withTimestamps();
    }

    public function modulos()
    {
        return $this->belongsToMany(Modulo::class, 'empresa_modulo')
                    ->withPivot('activo')
                    ->withTimestamps();
    }

    protected $appends = ['meses_activos', 'ganancia_total'];

    public function getMesesActivosAttribute()
    {
        return $this->renovaciones + 1; // El mes inicial + renovaciones
    }

    public function getGananciaTotalAttribute()
    {
        return $this->meses_activos * $this->monto_mensual;
    }
}