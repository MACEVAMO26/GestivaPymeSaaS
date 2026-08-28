<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('servicios_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresa')->onDelete('cascade');
            $table->string('consecutivo');
            $table->string('cliente_nombre');
            $table->string('servicio_requerido');
            $table->date('fecha_solicitada')->nullable();
            $table->time('hora_sugerida')->nullable();
            $table->string('direccion')->nullable();
            $table->string('estado')->default('Pendiente'); // Pendiente, Asignado, En Sitio, Finalizado, Cancelado
            $table->foreignId('tecnico_id')->nullable()->constrained('empleados')->onDelete('set null');
            $table->text('notas_ejecucion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('servicios_tickets');
    }
};
