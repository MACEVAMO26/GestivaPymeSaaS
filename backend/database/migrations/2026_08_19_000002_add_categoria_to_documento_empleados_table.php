<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Categoría del documento para organizar el expediente digital (Hoja de vida, Contrato, Cédula, etc).
     */
    public function up(): void
    {
        Schema::table('documento_empleados', function (Blueprint $table) {
            $table->string('categoria')->nullable()->after('nombre');
        });
    }

    public function down(): void
    {
        Schema::table('documento_empleados', function (Blueprint $table) {
            $table->dropColumn('categoria');
        });
    }
};