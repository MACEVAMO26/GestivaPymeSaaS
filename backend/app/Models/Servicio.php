<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Servicio extends Model
{
    use HasFactory;

    protected $table = 'servicios';

    public $timestamps = false;

    protected $fillable = [
        'categoria_id',
        'empresa_id',
        'nombre',
        'descripcion',
        'tarifa',
        'tiempo_estimado',
        'activo',
        'inactive_at'
    ];

    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'categoria_id');
    }
}
