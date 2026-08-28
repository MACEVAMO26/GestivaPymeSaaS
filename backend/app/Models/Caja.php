<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Caja extends Model
{
    use HasFactory;

    protected $table = 'cajas';

    protected $fillable = [
        'empresa_id',
        'usuario_apertura',
        'usuario_cierre',
        'saldo_inicial',
        'saldo_final',
        'abierta_en',
        'cerrada_en',
        'estado'
    ];

    public function movimientos()
    {
        return $this->hasMany(CajaMovimiento::class, 'caja_id');
    }
}
