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
        Schema::create('permisos', function (Blueprint $table) {
            $table->integer('id', true);
            $table->integer('rol_id')->nullable()->index();
            $table->string('modulo')->nullable();
            $table->boolean('puede_ver')->nullable();
            $table->boolean('puede_crear')->nullable();
            $table->boolean('puede_editar')->nullable();
            $table->boolean('puede_inactivar')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('permisos');
    }
};
