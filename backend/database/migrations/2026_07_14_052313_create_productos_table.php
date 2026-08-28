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
        Schema::create('productos', function (Blueprint $table) {
            $table->integer('id', true);
            $table->integer('categoria_id')->nullable()->index();
            $table->integer('empresa_id')->nullable()->index();
            $table->string('nombre')->nullable();
            $table->text('descripcion')->nullable();
            $table->decimal('precio_compra', 10)->nullable();
            $table->decimal('precio_venta', 10)->nullable();
            $table->integer('stock_inicial')->nullable();
            $table->string('unidad_medida')->nullable();
            $table->boolean('activo')->nullable()->default(true);
            $table->timestamp('inactive_at')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
