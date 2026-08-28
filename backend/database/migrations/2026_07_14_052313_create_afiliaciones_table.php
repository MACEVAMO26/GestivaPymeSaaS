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
        Schema::create('afiliaciones', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->integer('user_id')->index();
            $table->string('eps')->nullable();
            $table->string('arl')->nullable();
            $table->string('afondo_pension')->nullable();
            $table->string('estado')->default('pendiente');
            $table->date('fecha_contratacion')->nullable();
            $table->date('finalizacion_contrato')->nullable();
            $table->date('renovacion_contrato')->nullable();
            $table->string('documento_soporte_url')->nullable();
            $table->text('notas_rechazo')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('afiliaciones');
    }
};
