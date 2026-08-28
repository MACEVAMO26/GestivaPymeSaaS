<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Notificacion extends Model
{
    use HasFactory;

    // --- TABLA ---

    protected $table = 'notificaciones';

    // --- CAMPOS ---

    protected $fillable = [
        'usuario_id',
        'titulo',
        'descripcion',
        'leida'
    ];

    // --- RELACIONES ---
    
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}