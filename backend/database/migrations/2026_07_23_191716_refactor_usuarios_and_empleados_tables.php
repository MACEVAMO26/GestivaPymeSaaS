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
        // 1. Limpiar tabla `usuarios` (Quitar campos de RRHH que ahora van en Empleados)
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropColumn(['eps', 'arl', 'fondo_pension', 'fondo_cesantias', 'caja_compensacion', 'cargo_id']);
            $table->string('telefono')->nullable()->after('email');
            $table->string('direccion')->nullable()->after('telefono');
            $table->boolean('perfil_formalizado')->default(false)->after('debe_cambiar_clave')->comment('True cuando RRHH completa el perfil');
        });

        // 2. Recrear tabla `empleados` (borramos la anterior que estaba mal hecha si existe)
        Schema::dropIfExists('empleados');
        
        Schema::create('empleados', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_empleado')->unique()->nullable();
            
            // Relaciones principales
            $table->integer('usuario_id')->nullable()->index(); // Relación con la tabla 'usuarios'
            $table->integer('empresa_id')->nullable()->index(); // Relación con la tabla 'empresa'
            
            // Relaciones de formalización (RRHH)
            $table->integer('area_id')->nullable()->index();
            $table->integer('cargo_id')->nullable()->index();
            $table->integer('jerarquia_id')->nullable()->index(); // Por si hay líderes de área/proyectos
            
            // Datos laborales/RRHH
            $table->date('fecha_contratacion')->nullable();
            $table->string('tipo_contrato')->nullable();
            $table->decimal('salario', 12, 2)->nullable();
            
            // Seguridad Social
            $table->string('eps')->nullable();
            $table->string('arl')->nullable();
            $table->string('fondo_pension')->nullable();
            $table->string('fondo_cesantias')->nullable();
            $table->string('caja_compensacion')->nullable();
            
            // Estado y timestamps
            $table->enum('estado', ['activo', 'inactivo', 'en vacaciones', 'permiso'])->default('activo');
            $table->timestamps();
            
            // Add foreign keys (using raw definitions to match previous schema style)
            $table->foreign('usuario_id')->references('id')->on('usuarios')->onDelete('cascade');
            $table->foreign('empresa_id')->references('id')->on('empresa')->onDelete('cascade');
            // Assuming areas, cargos, and jerarquias tables exist and have 'id'
            // We will let these be simple indexes for now if the tables aren't perfectly aligned yet, 
            // but ideally we should add foreign keys.
            // $table->foreign('area_id')->references('id')->on('areas')->onDelete('set null');
            // $table->foreign('cargo_id')->references('id')->on('cargos')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('empleados');
        
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropColumn(['telefono', 'direccion', 'perfil_formalizado']);
            $table->string('eps')->nullable();
            $table->string('arl')->nullable();
            $table->string('fondo_pension')->nullable();
            $table->string('fondo_cesantias')->nullable();
            $table->string('caja_compensacion')->nullable();
            $table->integer('cargo_id')->nullable()->index();
        });
    }
};
