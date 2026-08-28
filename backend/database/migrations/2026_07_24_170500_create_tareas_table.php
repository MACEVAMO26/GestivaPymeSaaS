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
        Schema::create('tareas', function (Blueprint $table) {
            $table->id();
            $table->string('titulo');
            $table->text('descripcion')->nullable();
            $table->foreignId('asignador_id')->constrained('usuarios')->onDelete('cascade');
            $table->foreignId('asignado_id')->constrained('usuarios')->onDelete('cascade');
            $table->enum('estado', ['notificada', 'en_proceso', 'terminada'])->default('notificada');
            $table->foreignId('empresa_id')->constrained('empresa')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tareas');
    }
};
