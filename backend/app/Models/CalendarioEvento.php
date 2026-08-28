<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CalendarioEvento extends Model
{
    use HasFactory;

    protected $table = 'calendario_eventos';

    protected $fillable = [
        'usuario_id',
        'titulo',
        'descripcion',
        'fecha_inicio',
        'fecha_fin',
        'color_etiqueta'
    ];
}
