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
        Schema::table('usuarios', function (Blueprint $table) {
            $table->foreign(['empresa_id'])->references(['id'])->on('empresa')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['cargo_id'])->references(['id'])->on('cargos')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['rol_id'])->references(['id'])->on('roles')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropForeign('usuarios_ibfk_1');
            $table->dropForeign('usuarios_ibfk_2');
            $table->dropForeign('usuarios_ibfk_3');
        });
    }
};
