<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Vacacion extends Model
{
    use HasFactory;

    // --- TABLA ---

    protected $table = 'vacaciones';

    // --- CAMPOS ---
    
    protected $fillable = [
        'usuario_id',
        'fecha_inicio',
        'fecha_fin',
        'tipo',
        'observaciones',
        'estado',
        'justificacion_respuesta'
    ];

    
    // --- RELACIONES ---
    
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}