<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Producto;

class RecepcionDetalle extends Model
{
    use HasFactory;

    // --- TABLA ---

    protected $table = 'recepciones_detalle';

    // --- CAMPOS ---

    protected $fillable = [
        'recepcion_id',
        'producto_id',
        'cantidad_recibida',
        'estado_calidad'
    ];

    // --- RELACIONES ---
    
    public function recepcion()
    {
        return $this->belongsTo(Recepcion::class, 'recepcion_id');
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}