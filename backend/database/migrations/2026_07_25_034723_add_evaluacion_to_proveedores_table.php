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
        Schema::table('proveedores', function (Blueprint $table) {
            $table->integer('calificacion')->default(0)->nullable(); // 0 a 5 estrellas
            $table->text('comentarios_evaluacion')->nullable();
            $table->string('estado_evaluacion')->default('No Evaluado');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('proveedores', function (Blueprint $table) {
            $table->dropColumn(['calificacion', 'comentarios_evaluacion', 'estado_evaluacion']);
        });
    }
};
