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
        Schema::create('ordenes_compra_detalle', function (Blueprint $table) {
            $table->integer('id', true);
            $table->integer('orden_compra_id')->nullable()->index();
            $table->integer('producto_id')->nullable()->index();
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
        Schema::dropIfExists('ordenes_compra_detalle');
    }
};
