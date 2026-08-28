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
        Schema::table('movimientos_inventario', function (Blueprint $table) {
            $table->foreign(['producto_id'])->references(['id'])->on('productos')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['usuario_id'])->references(['id'])->on('usuarios')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movimientos_inventario', function (Blueprint $table) {
            $table->dropForeign('movimientos_inventario_ibfk_1');
            $table->dropForeign('movimientos_inventario_ibfk_2');
        });
    }
};
