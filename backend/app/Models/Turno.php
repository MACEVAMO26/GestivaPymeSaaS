<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Turno extends Model
{
    use HasFactory;

    // --- TABLA ---

    protected $table = 'turnos';

    // --- CAMPOS ---

    protected $fillable = [
        'nombre_turno',
        'hora_entrada',
        'hora_salida',
        'dias_semana',
        'activo',
        'inactive_at'
    ];

    // --- RELACIONES ---
      
    public function asignaciones()
    {
        return $this->hasMany(AsignacionTurno::class, 'turno_id');
    }
}