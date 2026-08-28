<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Proveedor extends Model
{
    use HasFactory;

    protected $table = 'proveedores';
    public $timestamps = false;
    protected $fillable = [
        'empresa_id', 
        'razon_social', 
        'nit', 
        'contacto', 
        'telefono', 
        'direccion', 
        'email', 
        'documentos_url', 
        'activo', 
        'inactive_at',
        'calificacion',
        'comentarios_evaluacion',
        'estado_evaluacion'
    ];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }
}
