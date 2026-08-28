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
        Schema::create('movimientos_inventario', function (Blueprint $table) {
            $table->integer('id', true);
            $table->integer('producto_id')->nullable()->index();
            $table->integer('usuario_id')->nullable()->index();
            $table->enum('tipo', ['entrada', 'salida', 'ajuste'])->nullable();
            $table->integer('cantidad')->nullable();
            $table->text('justificacion')->nullable();
            $table->timestamp('fecha_hora')->nullable()->useCurrent();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimientos_inventario');
    }
};
