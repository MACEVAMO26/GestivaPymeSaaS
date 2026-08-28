<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CajaMovimiento extends Model
{
    use HasFactory;

    protected $table = 'cajas_movimientos';

    protected $fillable = [
        'caja_id',
        'tipo',
        'monto',
        'concepto',
        'comprobante',
        'venta_id'
    ];

    public function caja()
    {
        return $this->belongsTo(Caja::class, 'caja_id');
    }
}
