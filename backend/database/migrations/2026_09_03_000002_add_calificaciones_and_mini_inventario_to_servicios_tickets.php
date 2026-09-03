<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('servicios_tickets', function (Blueprint $table) {
            $table->integer('calificacion_tecnico')->nullable()->after('notas_ejecucion');
            $table->text('feedback_tecnico')->nullable()->after('calificacion_tecnico');
            $table->integer('calificacion_cliente')->nullable()->after('feedback_tecnico');
            $table->text('feedback_cliente')->nullable()->after('calificacion_cliente');
            $table->decimal('costo_total', 12, 2)->default(0)->after('feedback_cliente');
            $table->integer('tiempo_minutos')->nullable()->after('costo_total');
            $table->string('equipo_recibido')->nullable()->after('tiempo_minutos');
            $table->string('serie_equipo')->nullable()->after('equipo_recibido');
            $table->text('accesorios_recibidos')->nullable()->after('serie_equipo');
            $table->text('falla_reportada')->nullable()->after('accesorios_recibidos');
            $table->timestamp('fecha_finalizacion')->nullable()->after('falla_reportada');
        });

        Schema::table('servicios_materiales', function (Blueprint $table) {
            $table->decimal('precio_unitario', 12, 2)->default(0)->after('cantidad');
            $table->decimal('subtotal', 12, 2)->default(0)->after('precio_unitario');
            $table->string('estado_material')->default('Utilizado')->after('subtotal');
        });
    }

    public function down(): void
    {
        Schema::table('servicios_tickets', function (Blueprint $table) {
            $table->dropColumn([
                'calificacion_tecnico',
                'feedback_tecnico',
                'calificacion_cliente',
                'feedback_cliente',
                'costo_total',
                'tiempo_minutos',
                'equipo_recibido',
                'serie_equipo',
                'accesorios_recibidos',
                'falla_reportada',
                'fecha_finalizacion'
            ]);
        });

        Schema::table('servicios_materiales', function (Blueprint $table) {
            $table->dropColumn([
                'precio_unitario',
                'subtotal',
                'estado_material'
            ]);
        });
    }
};
