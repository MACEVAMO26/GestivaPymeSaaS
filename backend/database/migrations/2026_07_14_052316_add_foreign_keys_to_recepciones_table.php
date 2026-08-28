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
        Schema::table('recepciones', function (Blueprint $table) {
            $table->foreign(['orden_compra_id'])->references(['id'])->on('ordenes_compra')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['usuario_id'])->references(['id'])->on('usuarios')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recepciones', function (Blueprint $table) {
            $table->dropForeign('recepciones_ibfk_1');
            $table->dropForeign('recepciones_ibfk_2');
        });
    }
};
