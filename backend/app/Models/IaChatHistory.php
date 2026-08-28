<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IaChatHistory extends Model
{
    use HasFactory;

    protected $table = 'ia_chat_history';

    protected $fillable = [
        'empresa_id',
        'rol',
        'mensaje',
        'modo',
    ];
}
