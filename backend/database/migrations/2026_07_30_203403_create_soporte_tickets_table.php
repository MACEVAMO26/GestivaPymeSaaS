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
        Schema::create('soporte_tickets', function (Blueprint $table) {
            $table->id();
            $table->integer('empresa_id');
            $table->foreign('empresa_id')->references('id')->on('empresa');
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('asunto');
            $table->text('mensaje');
            $table->enum('estado', ['Abierto', 'En progreso', 'Resuelto', 'Cerrado'])->default('Abierto');
            $table->foreignId('tecnico_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->text('notas_resolucion')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('soporte_tickets');
    }
};
