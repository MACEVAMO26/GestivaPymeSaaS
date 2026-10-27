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
        Schema::table('soporte_tickets', function (Blueprint $table) {
            if (!Schema::hasColumn('soporte_tickets', 'tipo')) {
                $table->string('tipo')->nullable()->default('Técnico')->after('asunto');
            }
            if (!Schema::hasColumn('soporte_tickets', 'prioridad')) {
                $table->string('prioridad', 20)->default('Media')->after('tipo');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('soporte_tickets', function (Blueprint $table) {
            if (Schema::hasColumn('soporte_tickets', 'prioridad')) {
                $table->dropColumn('prioridad');
            }
            if (Schema::hasColumn('soporte_tickets', 'tipo')) {
                $table->dropColumn('tipo');
            }
        });
    }
};
