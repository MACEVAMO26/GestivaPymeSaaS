<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresa')->onDelete('cascade');
            $table->string('factura_consecutivo');
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->onDelete('set null');
            $table->decimal('subtotal', 15, 2);
            $table->decimal('impuestos', 15, 2);
            $table->decimal('descuentos', 15, 2)->default(0);
            $table->decimal('total', 15, 2);
            $table->string('metodo_pago'); // Efectivo, Tarjeta, Transferencia
            $table->string('estado')->default('Pagada'); 
            $table->foreignId('vendedor_id')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ventas');
    }
};
