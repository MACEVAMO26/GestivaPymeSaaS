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
            $table->unsignedBigInteger('contrato_id')->nullable();
            $table->timestamp('fecha_firma')->nullable();
            $table->string('firma_gerente_url')->nullable();
            $table->string('contrato_pdf_url')->nullable();
            $table->foreign('contrato_id')->references('id')->on('saas_contratos')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('empresa', function (Blueprint $table) {
            $table->dropForeign(['contrato_id']);
            $table->dropColumn(['contrato_id', 'fecha_firma', 'firma_gerente_url', 'contrato_pdf_url']);
        });
    }
};
