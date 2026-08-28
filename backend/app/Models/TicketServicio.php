<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketServicio extends Model
{
    use HasFactory;

    protected $table = 'servicios_tickets';

    protected $fillable = [
        'empresa_id',
        'consecutivo',
        'cliente_nombre',
        'servicio_requerido',
        'fecha_solicitada',
        'hora_sugerida',
        'direccion',
        'estado',
        'tecnico_id',
        'notas_ejecucion'
    ];

    public function materiales()
    {
        return $this->hasMany(TicketMaterial::class, 'ticket_id');
    }
}
