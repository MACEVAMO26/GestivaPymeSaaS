<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Modulo extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';
    
    protected $fillable = [
        'id',
        'nombre',
        'paquete',
        'activo'
    ];

    public function empresas()
    {
        return $this->belongsToMany(Empresa::class, 'empresa_modulo')
                    ->withPivot('activo')
                    ->withTimestamps();
    }
}
