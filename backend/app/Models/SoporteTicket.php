<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SoporteTicket extends Model
{
    protected $fillable = [
        'empresa_id',
        'usuario_id',
        'asunto',
        'mensaje',
        'estado',
        'tecnico_id',
        'notas_resolucion',
        'activo'
    ];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function tecnico()
    {
        return $this->belongsTo(User::class, 'tecnico_id');
    }
}
