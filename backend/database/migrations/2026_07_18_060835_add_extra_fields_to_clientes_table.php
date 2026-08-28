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
        Schema::table('clientes', function (Blueprint $table) {
            $table->string('tipo_cliente')->nullable()->after('email'); // Particular, Empresa, etc.
            $table->string('membresia')->nullable()->after('tipo_cliente'); // Afiliacion, VIP, Regular
            $table->integer('pedidos_activos')->default(0)->after('membresia');
            $table->string('estado_pedido')->nullable()->after('pedidos_activos'); // alistando, empacando, en camino, entregado
            $table->string('estado_financiero')->nullable()->after('estado_pedido'); // facturas pendientes, al dia
            $table->text('comentarios')->nullable()->after('estado_financiero');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropColumn([
                'tipo_cliente',
                'membresia',
                'pedidos_activos',
                'estado_pedido',
                'estado_financiero',
                'comentarios'
            ]);
        });
    }

};
