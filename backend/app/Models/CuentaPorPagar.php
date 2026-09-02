<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CuentaPorPagar extends Model
{
    protected $table = 'cuentas_por_pagar';

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

    protected $casts = [
        'total' => 'float',
        'saldo_pendiente' => 'float',
        'fecha_emision' => 'date',
        'fecha_vencimiento' => 'date',
    ];

    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }
}