<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tareas', function (Blueprint $table) {
            $table->dropColumn('estado');
            $table->string('estado')->default('notificada')->after('asignado_id');
            $table->enum('tipo', ['individual', 'cooperativa'])->default('individual')->after('estado');
            $table->integer('area_id')->nullable()->after('tipo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tareas', function (Blueprint $table) {
            $table->dropColumn(['tipo', 'area_id', 'estado']);
            $table->enum('estado', ['notificada', 'en_proceso', 'terminada'])->default('notificada');
        });
    }
};