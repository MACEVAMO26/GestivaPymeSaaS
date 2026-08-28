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
        Schema::create('ordenes_compra', function (Blueprint $table) {
            $table->integer('id', true);
            $table->integer('proveedor_id')->nullable()->index();
            $table->integer('usuario_id')->nullable()->index();
            $table->date('fecha_requerida')->nullable();
            $table->enum('estado', ['pendiente', 'aprobada', 'rechazada', 'recibida_total', 'recibida_parcial', 'anulada'])->nullable();
            $table->text('justificacion_rechazo')->nullable();
            $table->text('motivo_anulacion')->nullable();
            $table->decimal('total', 10)->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ordenes_compra');
    }
};
