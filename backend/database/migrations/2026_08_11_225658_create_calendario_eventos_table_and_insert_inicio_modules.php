<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Crear tabla calendario_eventos
        Schema::create('calendario_eventos', function (Blueprint $table) {
            $table->id();
            $table->integer('usuario_id')->index();
            $table->string('titulo');
            $table->text('descripcion')->nullable();
            $table->dateTime('fecha_inicio');
            $table->dateTime('fecha_fin');
            $table->string('color_etiqueta')->default('#45a1ae');
            $table->timestamps();
        });

        // 2. Insertar registros en la tabla modulos
        DB::table('modulos')->insert([
            ['id' => 'inicio', 'nombre' => 'Inicio', 'paquete' => 'base', 'activo' => true],
            ['id' => 'i_rec', 'nombre' => 'Recordatorios', 'paquete' => 'base', 'activo' => true],
            ['id' => 'i_not', 'nombre' => 'Notificaciones', 'paquete' => 'base', 'activo' => true],
            ['id' => 'i_reu', 'nombre' => 'Reuniones', 'paquete' => 'base', 'activo' => true],
            ['id' => 'i_tar', 'nombre' => 'Resumen de Tareas', 'paquete' => 'base', 'activo' => true],
            ['id' => 'i_cal', 'nombre' => 'Calendario Personal', 'paquete' => 'base', 'activo' => true]
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Eliminar tabla calendario_eventos
        Schema::dropIfExists('calendario_eventos');

        // 2. Eliminar registros de la tabla modulos
        DB::table('modulos')->whereIn('id', ['inicio', 'i_rec', 'i_not', 'i_reu', 'i_tar', 'i_cal'])->delete();
    }
};
