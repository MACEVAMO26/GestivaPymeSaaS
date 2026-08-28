<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ia_configs', function (Blueprint $table) {
            $table->id();
            $table->string('proveedor')->unique()->comment('ej: openai, gemini');
            $table->text('api_key')->comment('Clave encriptada con Crypt');
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ia_configs');
    }
};
