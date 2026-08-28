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
        Schema::table('cotizaciones_pedidos_detalle', function (Blueprint $table) {
            $table->foreign(['cotizacion_pedido_id'])->references(['id'])->on('cotizaciones_pedidos')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cotizaciones_pedidos_detalle', function (Blueprint $table) {
            $table->dropForeign('cotizaciones_pedidos_detalle_ibfk_1');
        });
    }
};
