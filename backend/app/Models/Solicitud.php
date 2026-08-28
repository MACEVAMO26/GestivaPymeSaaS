<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Solicitud extends Model
{
    use HasFactory;

    protected $table = 'solicitudes';

    protected $fillable = [
        'empresa_id',
        'solicitante_id',
        'area',
        'entidad',
        'entidad_id',
        'accion',
        'motivo',
        'documento_url',
        'estado',
        'decisor_id',
        'nota_final',
    ];

    public function solicitante()
    {
        return $this->belongsTo(User::class, 'solicitante_id');
    }

    public function decisor()
    {
        return $this->belongsTo(User::class, 'decisor_id');
    }

    public function respuestas()
    {
        return $this->hasMany(SolicitudRespuesta::class, 'solicitud_id');
    }

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }
}