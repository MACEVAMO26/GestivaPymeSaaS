<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ia_sugerencias_personalizadas', function (Blueprint $table) {
            $table->id();
            $table->integer('empresa_id')->index();
            $table->string('mensaje', 500);
            $table->string('audiencia')->default('Todos'); // Puede ser Todos, Ventas, Gerencia, etc.
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ia_sugerencias_personalizadas');
    }
};
