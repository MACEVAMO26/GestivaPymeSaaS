<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cajas_movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caja_id')->constrained('cajas')->onDelete('cascade');
            $table->string('tipo'); // ingreso, egreso
            $table->decimal('monto', 15, 2);
            $table->string('concepto');
            $table->string('comprobante')->nullable();
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cajas_movimientos');
    }
};
