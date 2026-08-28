<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Renombra permisos.area -> permisos.modulo_id.
     *
     * La columna guarda el id de un MÓDULO (menú del cliente), no un área
     * organizacional (tabla areas). Este renombre deja claro el orden
     * jerárquico: Paquete 1---n Módulo 1---n Submódulo.
     */
    public function up(): void
    {
        Schema::table('permisos', function (Blueprint $table) {
            $table->renameColumn('area', 'modulo_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('permisos', function (Blueprint $table) {
            $table->renameColumn('modulo_id', 'area');
        });
    }
};