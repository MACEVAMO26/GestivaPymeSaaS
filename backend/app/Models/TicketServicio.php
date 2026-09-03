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
        'cliente_id',
        'cliente_nombre',
        'servicio_requerido',
        'fecha_solicitada',
        'hora_sugerida',
        'direccion',
        'estado',
        'tecnico_id',
        'notas_ejecucion',
        'calificacion_tecnico',
        'feedback_tecnico',
        'calificacion_cliente',
        'feedback_cliente',
        'costo_total',
        'tiempo_minutos',
        'equipo_recibido',
        'serie_equipo',
        'accesorios_recibidos',
        'falla_reportada',
        'fecha_finalizacion'
    ];

    protected $casts = [
        'calificacion_tecnico' => 'integer',
        'calificacion_cliente' => 'integer',
        'costo_total' => 'float',
        'tiempo_minutos' => 'integer',
        'fecha_finalizacion' => 'datetime'
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    public function materiales()
    {
        return $this->hasMany(TicketMaterial::class, 'ticket_id');
    }

    public function tecnico()
    {
        return $this->belongsTo(Empleado::class, 'tecnico_id');
    }

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }
}
