<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empresa', function (Blueprint $table) {
            // Modo de operación: apagado | simple | avanzado
            $table->string('ia_byok_modo')->default('apagado')->after('ia_byok_modelo');
            // Tareas permitidas como JSON: {"resumir":false,"redactar":false,"analizar":false,"automatizar":false}
            $table->json('ia_byok_tareas')->nullable()->after('ia_byok_modo');
            // Fuente de IA: 'gestivapyme' | 'propia'
            $table->string('ia_fuente')->default('gestivapyme')->after('ia_byok_tareas');
        });
    }

    public function down(): void
    {
        Schema::table('empresa', function (Blueprint $table) {
            $table->dropColumn(['ia_byok_modo', 'ia_byok_tareas', 'ia_fuente']);
        });
    }
};
