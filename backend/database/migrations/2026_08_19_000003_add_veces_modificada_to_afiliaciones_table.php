<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Contador de veces que el empleado modifica sus afiliaciones.
     * Limita a 2 cambios totales cuando la empresa NO tiene el módulo Gestión Humana.
     */
    public function up(): void
    {
        Schema::table('afiliaciones', function (Blueprint $table) {
            $table->unsignedInteger('veces_modificada')->default(0)->after('estado');
        });
    }

    public function down(): void
    {
        Schema::table('afiliaciones', function (Blueprint $table) {
            $table->dropColumn('veces_modificada');
        });
    }
};