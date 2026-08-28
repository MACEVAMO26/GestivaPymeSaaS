<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sede extends Model
{
    protected $table = 'sedes';
    
    protected $fillable = [
        'empresa_id',
        'nombre',
        'direccion',
        'telefono',
        'estado'
    ];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }
}
