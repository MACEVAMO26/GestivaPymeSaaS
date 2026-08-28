<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CotizacionPedido extends Model
{
    use HasFactory;

    protected $table = 'cotizaciones_pedidos';

    protected $fillable = [
        'cliente_id',
        'usuario_id',
        'tipo',
        'estado',
        'descuento',
        'total',
        'motivo_anulacion',
        'fecha_hora'
    ];

    public function detalles()
    {
        return $this->hasMany(CotizacionPedidoDetalle::class, 'cotizacion_pedido_id');
    }
}
