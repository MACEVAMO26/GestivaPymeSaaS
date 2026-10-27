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
        Schema::table('soporte_tickets', function (Blueprint $table) {
            // Eliminar constraints anteriores que apuntaban a 'users'
            DB::statement('ALTER TABLE soporte_tickets DROP CONSTRAINT IF EXISTS soporte_tickets_usuario_id_foreign');
            DB::statement('ALTER TABLE soporte_tickets DROP CONSTRAINT IF EXISTS soporte_tickets_tecnico_id_foreign');

            // Crear nuevos foreign keys que apunten a la tabla real 'usuarios'
            $table->foreign('usuario_id')->references('id')->on('usuarios')->cascadeOnDelete();
            $table->foreign('tecnico_id')->references('id')->on('usuarios')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('soporte_tickets', function (Blueprint $table) {
            DB::statement('ALTER TABLE soporte_tickets DROP CONSTRAINT IF EXISTS soporte_tickets_usuario_id_foreign');
            DB::statement('ALTER TABLE soporte_tickets DROP CONSTRAINT IF EXISTS soporte_tickets_tecnico_id_foreign');
        });
    }
};
