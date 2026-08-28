<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
 
class TarifaCatalogo extends Model
{
    use HasFactory;
 
    protected $table = 'tarifas_catalogo';
    
    // El id es string (no auto-incrementable)
    public $incrementing = false;
    protected $keyType = 'string';
 
    protected $fillable = [
        'id',
        'nombre',
        'tipo',
        'mecanismo',
        'valor',
        'activo'
    ];
 
    public function empresas()
    {
        return $this->belongsToMany(Empresa::class, 'empresa_tarifas', 'tarifa_id', 'empresa_id')
                    ->withPivot('cantidad', 'valor_aplicado')
                    ->withTimestamps();
    }
}
