<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Models\Turno;
use App\Models\User;

class AsignacionTurno extends Model
{
    use HasFactory;

    // --- TABLA ---
    protected $table = 'asignacion_turnos';

    // --- CAMPOS ---
    protected $fillable = [
        'usuario_id',
        'turno_id',
        'fecha_desde',
        'fecha_hasta'
    ];

    // --- RELACIONES ---
    
    public function turno()
    {
        return $this->belongsTo(Turno::class, 'turno_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}