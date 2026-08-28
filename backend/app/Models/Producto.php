<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    use HasFactory;

    // --- TABLA ---
    
    protected $table = 'productos';

    // --- TIMESTAMPS ---
    
    public $timestamps = false;

    // --- CAMPOS ---
    
    protected $fillable = [
        'categoria_id', 
        'empresa_id', 
        'nombre', 
        'descripcion', 
        'precio_compra', 
        'precio_venta', 
        'stock_inicial', 
        'unidad_medida',
        'imagen_url',
        'activo', 
        'inactive_at'
    ];

    // --- RELACIONES ---
    
    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'categoria_id');
    }
}