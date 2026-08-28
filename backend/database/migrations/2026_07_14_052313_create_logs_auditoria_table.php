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
        Schema::create('logs_auditoria', function (Blueprint $table) {
            $table->bigInteger('id', true);
            $table->integer('usuario_id')->nullable()->index();
            $table->string('modulo')->nullable();
            $table->string('accion')->nullable();
            $table->integer('entidad_afectada_id')->nullable();
            $table->text('descripcion')->nullable();
            $table->string('ip_origen')->nullable();
            $table->timestamp('fecha_hora')->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('logs_auditoria');
    }
};
