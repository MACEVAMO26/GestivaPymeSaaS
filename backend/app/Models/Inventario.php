<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Producto; 

class Inventario extends Model
{
    use HasFactory;

    // --- TABLA ---
    
    protected $table = 'inventario';

    // --- CAMPOS ---
    
    protected $fillable = [
        'producto_id',
        'stock_actual',
        'stock_minimo',
        'bodega',
        'estante',
        'posicion'
    ];

        
    // --- RELACIONES ---
    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}