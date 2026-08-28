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
        // 1. Modificar tabla usuarios
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropColumn(['nombres', 'apellidos']);
            
            $table->string('primer_nombre')->nullable()->after('rol_id');
            $table->string('segundo_nombre')->nullable()->after('primer_nombre');
            $table->string('primer_apellido')->nullable()->after('segundo_nombre');
            $table->string('segundo_apellido')->nullable()->after('primer_apellido');
            
            $table->enum('tipo_documento', ['CC', 'CE', 'Pasaporte', 'PEP', 'PPT'])->nullable()->after('segundo_apellido');
        });

        // 2. Modificar tabla permisos (Renombrar columna modulo a area)
        Schema::table('permisos', function (Blueprint $table) {
            $table->renameColumn('modulo', 'area');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->string('nombres')->nullable();
            $table->string('apellidos')->nullable();
            
            $table->dropColumn(['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'tipo_documento']);
        });

        Schema::table('permisos', function (Blueprint $table) {
            $table->renameColumn('area', 'modulo');
        });
    }
};
