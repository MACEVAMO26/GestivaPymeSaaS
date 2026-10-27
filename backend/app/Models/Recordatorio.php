<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Recordatorio extends Model
{
    // Bloque de atributos asignables en masa
    protected $fillable = [
        'usuario_id',
        'titulo',
        'descripcion',
        'completado'
    ];
}
