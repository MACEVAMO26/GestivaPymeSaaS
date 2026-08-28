<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketMaterial extends Model
{
    use HasFactory;

    protected $table = 'servicios_materiales';

    protected $fillable = [
        'ticket_id',
        'producto_id',
        'cantidad'
    ];

    public function ticket()
    {
        return $this->belongsTo(TicketServicio::class, 'ticket_id');
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
