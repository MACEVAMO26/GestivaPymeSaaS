<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CuentaPorPagar extends Model
{
    protected $fillable = [
        'proveedor_id',
        'factura_numero',
        'concepto',
        'total',
        'saldo_pendiente',
        'fecha_emision',
        'fecha_vencimiento',
        'estado',
    ];

    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class);
    }
}