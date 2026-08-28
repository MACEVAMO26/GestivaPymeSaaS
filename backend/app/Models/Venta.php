<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Venta extends Model
{
    protected $fillable = [
        'factura_consecutivo',
        'cliente_id',
        'subtotal',
        'impuestos',
        'descuentos',
        'total',
        'metodo_pago',
        'estado',
        'estado_paquete',
        'vendedor_id',
        'empresa_id'
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    public function detalles()
    {
        return $this->hasMany(VentaDetalle::class, 'venta_id');
    }
}