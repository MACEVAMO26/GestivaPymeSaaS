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
        Schema::create('vacaciones', function (Blueprint $table) {
            $table->integer('id', true);
            $table->integer('usuario_id')->nullable()->index();
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();
            $table->enum('tipo', ['Disfrute Legal', 'Colectivas', 'Anticipadas'])->default('Disfrute Legal');
            $table->text('observaciones')->nullable();
            $table->enum('estado', ['pendiente', 'aprobada', 'rechazada'])->nullable()->default('pendiente');
            $table->text('justificacion_respuesta')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vacaciones');
    }
};
