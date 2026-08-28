<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class LogAuditoria extends Model
{
    use HasFactory;

    // --- TABLA ---
    protected $table = 'logs_auditoria';

    public $timestamps = false;

    
    // --- CAMPOS ---
    
        protected $fillable = [
        'usuario_id',
        'modulo',
        'accion',
        'entidad_afectada_id',
        'descripcion',
        'ip_origen',
        'fecha_hora'
    ];

    // --- CASTS ---
    
    protected $casts = [
        'fecha_hora' => 'datetime',
    ];

    // --- RELACIONES ---
    
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}