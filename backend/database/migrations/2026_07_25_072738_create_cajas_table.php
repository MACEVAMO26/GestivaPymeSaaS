<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cajas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresa')->onDelete('cascade');
            $table->foreignId('usuario_apertura')->constrained('usuarios');
            $table->foreignId('usuario_cierre')->nullable()->constrained('usuarios');
            $table->decimal('saldo_inicial', 15, 2);
            $table->decimal('saldo_final', 15, 2)->nullable();
            $table->timestamp('abierta_en');
            $table->timestamp('cerrada_en')->nullable();
            $table->string('estado')->default('Abierta'); // Abierta, Cerrada
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cajas');
    }
};
