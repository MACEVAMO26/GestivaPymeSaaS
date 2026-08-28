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
        Schema::create('empresa', function (Blueprint $table) {
            $table->integer('id', true);
            $table->string('razon_social');
            $table->string('nit')->unique();
            $table->enum('tipo_empresa', ['Servicios', 'Ventas', 'Ventas y Servicios', 'Especial']);
            $table->string('direccion')->nullable();
            $table->string('telefono')->nullable();
            $table->string('email')->nullable();
            $table->string('ciudad')->nullable();
            $table->string('logo_url')->nullable();
            $table->boolean('activo')->nullable()->default(true);
            $table->string('estado_pago')->default('al_dia');
            $table->timestamp('inactive_at')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
            $table->string('plan_suscripcion')->nullable()->default('Básico');
            $table->date('fecha_inscripcion')->nullable();
            $table->integer('renovaciones')->default(0);
            $table->decimal('monto_mensual', 10)->default(0);
            $table->date('fecha_proximo_pago')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->string('estado_servidor')->default('online');
            $table->timestamp('ultimo_ping')->nullable();
            $table->string('descuento')->nullable()->default('N/A');
            $table->string('periodo')->default('Mensual');
            $table->json('descuentos_aplicados')->nullable();
            $table->json('cargos_extra')->nullable();
            $table->json('addons_personalizados')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('empresa');
    }
};
