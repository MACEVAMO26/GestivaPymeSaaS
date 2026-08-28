<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    use HasFactory;

    protected $table = 'clientes';
    public $timestamps = false;
    protected $fillable = [
        'empresa_id', 
        'nombres', 
        'apellidos', 
        'nombre_razon_social', 
        'documento', 
        'email', 
        'telefono', 
        'direccion', 
        'ciudad', 
        'activo', 
        'inactive_at',
        'tipo_cliente',
        'membresia',
        'pedidos_activos',
        'estado_pedido',
        'estado_financiero',
        'comentarios'
    ];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }
}
