<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentoEmpleado extends Model
{
    protected $table = 'documento_empleados';

    protected $fillable = [
        'empleado_id',
        'nombre',
        'categoria',
        'tipo_archivo',
        'cloudinary_url',
        'cloudinary_public_id',
    ];

    public function empleado()
    {
        return $this->belongsTo(Empleado::class);
    }
}
