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
        Schema::table('recepciones_detalle', function (Blueprint $table) {
            $table->foreign(['recepcion_id'])->references(['id'])->on('recepciones')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['producto_id'])->references(['id'])->on('productos')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recepciones_detalle', function (Blueprint $table) {
            $table->dropForeign('recepciones_detalle_ibfk_1');
            $table->dropForeign('recepciones_detalle_ibfk_2');
        });
    }
};
