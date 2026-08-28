<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Categoria extends Model
{
    use HasFactory;

    // --- TABLA ---
    protected $table = 'categorias';

    // --- TIMESTAMPS ---
    public $timestamps = false;

    // --- CAMPOS ---
    protected $fillable = [
        'empresa_id', 
        'nombre', 
        'descripcion', 
        'tipo', 
        'activo', 
        'inactive_at'
    ];

    // --- RELACIONES ---
    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function productos()
    {
        return $this->hasMany(Producto::class, 'categoria_id');
    }
}
