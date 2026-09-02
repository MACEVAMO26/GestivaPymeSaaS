<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Empleado extends Model
{
    protected $fillable = [
        'codigo_empleado',
        'usuario_id',
        'empresa_id',
        'sede_id',
        'area_id',
        'cargo_id',
        'jerarquia_id',
        'fecha_contratacion',
        'fecha_fin_contrato',
        'tipo_contrato',
        'salario',
        'eps',
        'arl',
        'estado_afiliacion',
        'fondo_pension',
        'fondo_cesantias',
        'caja_compensacion',
        'modulos_permitidos',
        'estado'
    ];

    protected $casts = [
        'modulos_permitidos' => 'array',
        'salario' => 'float'
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function area()
    {
        return $this->belongsTo(Area::class, 'area_id');
    }

    public function cargo()
    {
        return $this->belongsTo(Cargo::class, 'cargo_id');
    }

    public function sede()
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }
}
