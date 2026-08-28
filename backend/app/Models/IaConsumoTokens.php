<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
 
class IaConsumoTokens extends Model
{
    use HasFactory;
 
    protected $table = 'ia_consumo_tokens';
 
    protected $fillable = [
        'empresa_id',
        'usuario_id',
        'modo',
        'fecha',
        'tokens_entrada',
        'tokens_salida',
        'cantidad_consultas'
    ];
 
    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }
 
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
