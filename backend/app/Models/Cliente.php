<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    use HasFactory;

    protected $table = 'clientes';
    public $timestamps = true;

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

    public function ventas()
    {
        return $this->hasMany(Venta::class, 'cliente_id')->orderBy('id', 'desc');
    }

    public function cotizacionesPedidos()
    {
        return $this->hasMany(CotizacionPedido::class, 'cliente_id')->orderBy('id', 'desc');
    }

    public function tickets()
    {
        return $this->hasMany(TicketServicio::class, 'cliente_id')->orderBy('id', 'desc');
    }
}
