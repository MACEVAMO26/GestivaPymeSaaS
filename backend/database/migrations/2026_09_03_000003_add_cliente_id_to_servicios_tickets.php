<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('servicios_tickets', function (Blueprint $table) {
            if (!Schema::hasColumn('servicios_tickets', 'cliente_id')) {
                $table->integer('cliente_id')->nullable()->after('consecutivo')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('servicios_tickets', function (Blueprint $table) {
            if (Schema::hasColumn('servicios_tickets', 'cliente_id')) {
                $table->dropColumn('cliente_id');
            }
        });
    }
};
