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
        // Campos BYOK en la tabla empresa
        Schema::table('empresa', function (Blueprint $table) {
            $table->boolean('ia_byok_activo')->default(false);
            $table->string('ia_byok_proveedor')->nullable();
            $table->text('ia_byok_key')->nullable();
            $table->string('ia_byok_modelo')->nullable();
        });

        // Campo de modo IA por usuario en usuarios
        Schema::table('usuarios', function (Blueprint $table) {
            $table->string('ia_modo')->default('ninguno'); // 'simple', 'avanzado', 'ninguno'
        });
    }
 
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('empresa', function (Blueprint $table) {
            $table->dropColumn(['ia_byok_activo', 'ia_byok_proveedor', 'ia_byok_key', 'ia_byok_modelo']);
        });

        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropColumn('ia_modo');
        });
    }
};
