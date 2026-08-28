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
        Schema::create('cotizaciones_pedidos', function (Blueprint $table) {
            $table->integer('id', true);
            $table->integer('cliente_id')->nullable()->index();
            $table->integer('usuario_id')->nullable()->index();
            $table->enum('tipo', ['cotizacion', 'pedido', 'factura'])->nullable();
            $table->enum('estado', ['borrador', 'enviada', 'aprobada', 'convertida', 'facturada', 'anulada'])->nullable();
            $table->decimal('descuento', 10)->nullable()->default(0);
            $table->decimal('total', 10)->nullable();
            $table->text('motivo_anulacion')->nullable();
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
        Schema::dropIfExists('cotizaciones_pedidos');
    }
};
