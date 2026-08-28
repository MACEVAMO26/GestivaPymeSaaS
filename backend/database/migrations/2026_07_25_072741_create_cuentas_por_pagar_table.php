<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuentas_por_pagar', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proveedor_id')->constrained('proveedores')->onDelete('cascade');
            $table->string('factura_numero');
            $table->string('concepto');
            $table->decimal('total', 15, 2);
            $table->decimal('saldo_pendiente', 15, 2);
            $table->date('fecha_emision');
            $table->date('fecha_vencimiento');
            $table->string('estado')->default('Pendiente'); // Pendiente, Pagada, Vencida
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cuentas_por_pagar');
    }
};
