<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CotizacionPedidoDetalle extends Model
{
    use HasFactory;

    protected $table = 'cotizaciones_pedidos_detalle';

    protected $fillable = [
        'cotizacion_pedido_id',
        'tipo_item',
        'item_id',
        'cantidad',
        'precio_unitario',
        'subtotal'
    ];

    public function cotizacionPedido()
    {
        return $this->belongsTo(CotizacionPedido::class, 'cotizacion_pedido_id');
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'item_id');
    }

    public function servicio()
    {
        return $this->belongsTo(Servicio::class, 'item_id');
    }
}
