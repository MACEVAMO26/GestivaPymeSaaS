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
        Schema::create('solicitudes', function (Blueprint $table) {
            $table->id();
            $table->integer('empresa_id')->index();
            $table->integer('solicitante_id')->index();
            $table->string('area')->index();
            $table->string('entidad')->nullable();
            $table->integer('entidad_id')->nullable();
            $table->string('accion');
            $table->text('motivo')->nullable();
            $table->string('documento_url')->nullable();
            $table->enum('estado', ['pendiente', 'en_replica', 'aprobada', 'rechazada', 'ejecutada'])->default('pendiente');
            $table->integer('decisor_id')->nullable();
            $table->text('nota_final')->nullable();
            $table->timestamps();

            $table->foreign('empresa_id')->references('id')->on('empresa')->onDelete('cascade');
            $table->foreign('solicitante_id')->references('id')->on('usuarios')->onDelete('cascade');
            $table->foreign('decisor_id')->references('id')->on('usuarios')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('solicitudes');
    }
};