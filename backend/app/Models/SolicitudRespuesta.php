<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SolicitudRespuesta extends Model
{
    use HasFactory;

    protected $table = 'solicitud_respuestas';

    protected $fillable = [
        'solicitud_id',
        'usuario_id',
        'mensaje',
    ];

    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class, 'solicitud_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}