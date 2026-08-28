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
        Schema::create('usuarios', function (Blueprint $table) {
            $table->integer('id', true);
            $table->integer('empresa_id')->nullable()->index();
            $table->integer('cargo_id')->nullable()->index();
            $table->integer('rol_id')->nullable()->index();
            $table->string('nombres')->nullable();
            $table->string('apellidos')->nullable();
            $table->string('documento')->nullable()->unique();
            $table->string('email')->nullable()->unique();
            $table->string('avatar_url')->nullable();
            $table->string('password_hash')->nullable();
            $table->boolean('debe_cambiar_clave')->default(true);
            $table->string('eps')->nullable();
            $table->string('arl')->nullable();
            $table->string('fondo_pension')->nullable();
            $table->string('fondo_cesantias')->nullable();
            $table->string('caja_compensacion')->nullable();
            $table->string('telegram_chat_id')->nullable()->unique();
            $table->boolean('activo')->nullable()->default(true);
            $table->timestamp('inactive_at')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
            $table->timestamp('last_activity_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
