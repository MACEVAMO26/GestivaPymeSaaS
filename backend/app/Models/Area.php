<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Area extends Model
{
    protected $fillable = ['nombre', 'descripcion', 'empresa_id'];

    public function modulos()
    {
        return $this->belongsToMany(Modulo::class, 'area_modulo', 'area_id', 'modulo_id');
    }
}
