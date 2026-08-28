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
        Schema::table('empresa', function (Blueprint $table) {
            $table->string('color_secundario', 7)->nullable()->after('color_primario');
            $table->string('color_fondo', 7)->nullable()->after('color_secundario');
            $table->string('color_texto', 7)->nullable()->after('color_fondo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('empresa', function (Blueprint $table) {
            $table->dropColumn(['color_secundario', 'color_fondo', 'color_texto']);
        });
    }
};
