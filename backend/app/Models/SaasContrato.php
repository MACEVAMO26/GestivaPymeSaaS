<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaasContrato extends Model
{
    use HasFactory;

    protected $table = 'saas_contratos';

    protected $fillable = [
        'contenido',
        'version',
        'es_activo',
    ];

    protected $casts = [
        'es_activo' => 'boolean',
    ];

    public function empresas()
    {
        return $this->hasMany(Empresa::class, 'contrato_id');
    }
}
