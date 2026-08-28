<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    // --- TABLA ---
    
    protected $table = 'usuarios';

    
    // --- TIMESTAMPS ---
    
    public $timestamps = false;

    
    // --- CAMPOS ---
    
    protected $fillable = [
        'empresa_id',
        'rol_id',
        'nombres',
        'apellidos',
        'primer_nombre',
        'segundo_nombre',
        'primer_apellido',
        'segundo_apellido',
        'tipo_documento',
        'documento',
        'email',
        'email_personal',
        'password_hash',
        'avatar_url',
        'activo',
        'inactive_at',
        'telegram_chat_id',
        'telefono',
        'direccion',
        'perfil_formalizado',
        'debe_cambiar_clave',
        'last_activity_at',
        'ia_modo'
    ];

    // Nombres completos calculados a partir de las columnas reales
    protected $appends = ['nombres', 'apellidos'];

    public function getNombresAttribute()
    {
        return trim(($this->primer_nombre ?? '') . ' ' . ($this->segundo_nombre ?? ''));
    }

    public function setNombresAttribute($value)
    {
        $partes = preg_split('/\s+/', trim((string) $value), 2);
        $this->primer_nombre = $partes[0] ?? null;
        $this->segundo_nombre = $partes[1] ?? null;
    }

    public function getApellidosAttribute()
    {
        return trim(($this->primer_apellido ?? '') . ' ' . ($this->segundo_apellido ?? ''));
    }

    public function setApellidosAttribute($value)
    {
        $partes = preg_split('/\s+/', trim((string) $value), 2);
        $this->primer_apellido = $partes[0] ?? null;
        $this->segundo_apellido = $partes[1] ?? null;
    }

    
    // --- OCULTOS ---
    
    protected $hidden = [
        'password_hash',
    ];


    // --- RELACIONES ---
    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function cargo()
    {
        return $this->hasOneThrough(Cargo::class, Empleado::class, 'usuario_id', 'id', 'id', 'cargo_id');
    }

    public function rol()
    {
        return $this->belongsTo(Role::class, 'rol_id');
    }

    public function empleado()
    {
        return $this->hasOne(Empleado::class, 'usuario_id');
    }
}