<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reuniones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresa');
            $table->foreignId('organizador_id')->constrained('usuarios');
            $table->string('titulo');
            $table->text('descripcion')->nullable();
            $table->dateTime('fecha_hora');
            $table->enum('tipo_encuentro', ['virtual', 'presencial'])->default('virtual');
            $table->enum('audiencia', ['todos', 'area', 'gerencia']);
            $table->string('enlace_lugar')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reuniones');
    }
};
