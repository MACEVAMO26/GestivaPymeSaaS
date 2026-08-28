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
        Schema::create('tarifas_catalogo', function (Blueprint $table) {
            $table->string('id')->primary(); // ej: 'plan_basico', 'ia_simple', 'addon_whatsapp'
            $table->string('nombre');
            $table->enum('tipo', ['plan', 'modulo_adicional', 'ia_plan', 'addon', 'descuento']);
            $table->enum('mecanismo', ['fijo', 'por_usuario', 'porcentaje']);
            $table->decimal('valor', 12, 2)->default(0.00);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }
 
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tarifas_catalogo');
    }
};
