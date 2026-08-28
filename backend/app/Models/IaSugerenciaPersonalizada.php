<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IaSugerenciaPersonalizada extends Model
{
    use HasFactory;

    protected $table = 'ia_sugerencias_personalizadas';

    protected $fillable = [
        'empresa_id',
        'mensaje',
        'audiencia',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];
}
