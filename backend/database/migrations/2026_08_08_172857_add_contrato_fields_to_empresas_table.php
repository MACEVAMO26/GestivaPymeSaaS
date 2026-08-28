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
            $table->boolean('contrato_aceptado')->default(false)->after('email');
            $table->timestamp('contrato_fecha_aceptacion')->nullable()->after('contrato_aceptado');
            $table->string('contrato_ip_aceptacion')->nullable()->after('contrato_fecha_aceptacion');
            $table->text('contrato_firma_path')->nullable()->after('contrato_ip_aceptacion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('empresa', function (Blueprint $table) {
            $table->dropColumn([
                'contrato_aceptado', 
                'contrato_fecha_aceptacion', 
                'contrato_ip_aceptacion', 
                'contrato_firma_path'
            ]);
        });
    }
};
