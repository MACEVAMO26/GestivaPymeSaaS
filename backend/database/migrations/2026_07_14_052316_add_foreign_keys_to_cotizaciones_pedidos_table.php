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
        Schema::table('cotizaciones_pedidos', function (Blueprint $table) {
            $table->foreign(['cliente_id'])->references(['id'])->on('clientes')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['usuario_id'])->references(['id'])->on('usuarios')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cotizaciones_pedidos', function (Blueprint $table) {
            $table->dropForeign('cotizaciones_pedidos_ibfk_1');
            $table->dropForeign('cotizaciones_pedidos_ibfk_2');
        });
    }
};
