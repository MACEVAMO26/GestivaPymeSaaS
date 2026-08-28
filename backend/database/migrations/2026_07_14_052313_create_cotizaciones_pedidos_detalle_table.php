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
        Schema::create('cotizaciones_pedidos_detalle', function (Blueprint $table) {
            $table->integer('id', true);
            $table->integer('cotizacion_pedido_id')->nullable()->index();
            $table->enum('tipo_item', ['producto', 'servicio'])->nullable();
            $table->integer('item_id')->nullable();
            $table->integer('cantidad')->nullable();
            $table->decimal('precio_unitario', 10)->nullable();
            $table->decimal('subtotal', 10)->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cotizaciones_pedidos_detalle');
    }
};
