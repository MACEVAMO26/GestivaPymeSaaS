<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            // Drop global unique constraint on documento if it exists
            try {
                $table->dropUnique('clientes_documento_unique');
            } catch (\Throwable $e) {
                // Ignore if not present
            }
        });

        // Add composite unique if not already present
        try {
            Schema::table('clientes', function (Blueprint $table) {
                $table->unique(['empresa_id', 'documento'], 'clientes_empresa_documento_unique');
            });
        } catch (\Throwable $e) {
            // Ignore if already present
        }
    }

    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            try {
                $table->dropUnique('clientes_empresa_documento_unique');
                $table->unique('documento', 'clientes_documento_unique');
            } catch (\Throwable $e) {
            }
        });
    }
};
