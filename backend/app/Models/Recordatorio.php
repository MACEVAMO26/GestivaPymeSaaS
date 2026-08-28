<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Recordatorio extends Model
{
    protected $fillable = [
        'usuario_id',
        'titulo',
        'descripcion',
        'completado'
    ];
}
