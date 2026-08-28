<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'telefono',
        'correo',
        'horario_llamada',
        'mensaje',
        'estado',
        'notas'
    ];

    protected $casts = [
        'notas' => 'array'
    ];
}
