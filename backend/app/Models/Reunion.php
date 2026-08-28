<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reunion extends Model
{
    use HasFactory;

    protected $table = 'reuniones';

    protected $fillable = [
        'empresa_id',
        'organizador_id',
        'titulo',
        'descripcion',
        'fecha_hora',
        'tipo_encuentro',
        'audiencia',
        'enlace_lugar',
    ];

    protected $casts = [
        'fecha_hora' => 'datetime',
    ];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function organizador()
    {
        return $this->belongsTo(User::class, 'organizador_id');
    }
}
