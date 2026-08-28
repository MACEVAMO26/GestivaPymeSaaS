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
        Schema::table('cargos', function (Blueprint $table) {
            $table->foreign(['empresa_id'])->references(['id'])->on('empresa')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['rol_id'])->references(['id'])->on('roles')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cargos', function (Blueprint $table) {
            $table->dropForeign('cargos_ibfk_1');
            $table->dropForeign('cargos_ibfk_2');
        });
    }
};
