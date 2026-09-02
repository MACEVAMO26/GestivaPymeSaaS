<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\OrdenCompraDetalle;

class OrdenCompra extends Model
{
    use HasFactory;

    // --- TABLA ---

    protected $table = 'ordenes_compra';

    // --- TIMESTAMPS ---
    public $timestamps = true;

    // --- CAMPOS ---

    protected $fillable = [
        'proveedor_id',
        'usuario_id',
        'fecha_requerida',
        'estado',
        'justificacion_rechazo',
        'motivo_anulacion',
        'total',
    ];

    protected $casts = [
        'total' => 'float',
        'fecha_requerida' => 'date',
    ];

    // --- RELACIONES ---
    
    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    public function detalles()
    {
        return $this->hasMany(OrdenCompraDetalle::class, 'orden_compra_id');
    }
}