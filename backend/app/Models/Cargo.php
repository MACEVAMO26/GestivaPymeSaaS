<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cargo extends Model
{
    use HasFactory;

    
    // --- TABLA ---

    protected $table = 'cargos';

   
    // --- TIMESTAMPS ---

    public $timestamps = false;

   
    // --- CAMPOS ---
    
    protected $fillable = [
        'empresa_id',
        'rol_id',
        'area_id',
        'nombre',
        'descripcion',
        'funciones',
        'activo',
        'inactive_at'
    ];

    // --- RELACIONES ---

    public function area()
    {
        return $this->belongsTo(Area::class, 'area_id');
    }

    public function rol()
    {
        return $this->belongsTo(Role::class, 'rol_id');
    }
}