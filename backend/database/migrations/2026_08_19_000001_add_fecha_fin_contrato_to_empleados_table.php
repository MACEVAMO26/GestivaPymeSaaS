<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fecha fin del contrato para alertas de vencimiento (solo contratos a término fijo/por obra/práctica).
     */
    public function up(): void
    {
        Schema::table('empleados', function (Blueprint $table) {
            $table->date('fecha_fin_contrato')->nullable()->after('fecha_contratacion');
        });
    }

    public function down(): void
    {
        Schema::table('empleados', function (Blueprint $table) {
            $table->dropColumn('fecha_fin_contrato');
        });
    }
};