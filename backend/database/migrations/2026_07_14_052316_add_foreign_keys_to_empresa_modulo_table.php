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
        Schema::table('empresa_modulo', function (Blueprint $table) {
            $table->foreign(['empresa_id'])->references(['id'])->on('empresa')->onUpdate('no action')->onDelete('cascade');
            $table->foreign(['modulo_id'])->references(['id'])->on('modulos')->onUpdate('no action')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('empresa_modulo', function (Blueprint $table) {
            $table->dropForeign('empresa_modulo_empresa_id_foreign');
            $table->dropForeign('empresa_modulo_modulo_id_foreign');
        });
    }
};
