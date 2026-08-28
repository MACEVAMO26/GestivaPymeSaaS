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
        Schema::table('logs_auditoria', function (Blueprint $table) {
            $table->foreign(['usuario_id'])->references(['id'])->on('usuarios')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('logs_auditoria', function (Blueprint $table) {
            $table->dropForeign('logs_auditoria_ibfk_1');
        });
    }
};
