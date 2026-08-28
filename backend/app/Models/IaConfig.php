<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IaConfig extends Model
{
    use HasFactory;

    protected $table = 'ia_configs';

    protected $fillable = [
        'proveedor',
        'api_key',
        'modo',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
