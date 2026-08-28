<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\OrdenCompra;
use App\Models\User;

class Recepcion extends Model
{
    use HasFactory;

    // --- TABLA ---

    protected $table = 'recepciones';

    // --- CAMPOS ---

    protected $fillable = [
        'orden_compra_id',
        'usuario_id',
        'fecha_recepcion',
        'observaciones'
    ];

    // --- RELACIONES ---
    public function ordenCompra()
    {
        return $this->belongsTo(OrdenCompra::class, 'orden_compra_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }


    public function detalles()
    {
        return $this->hasMany(RecepcionDetalle::class, 'recepcion_id');
    }
}