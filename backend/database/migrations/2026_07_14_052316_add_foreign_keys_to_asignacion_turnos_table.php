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
        Schema::table('asignacion_turnos', function (Blueprint $table) {
            $table->foreign(['usuario_id'])->references(['id'])->on('usuarios')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['turno_id'])->references(['id'])->on('turnos')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('asignacion_turnos', function (Blueprint $table) {
            $table->dropForeign('asignacion_turnos_ibfk_1');
            $table->dropForeign('asignacion_turnos_ibfk_2');
        });
    }
};
