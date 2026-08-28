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
        Schema::create('ia_chat_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('empresa_id')->nullable();
            $table->string('rol')->comment('user, assistant, system');
            $table->text('mensaje');
            $table->string('modo')->default('basico')->comment('basico o avanzado');
            $table->timestamps();
            
            // Si quieres que dependa de empresa_id:
            // $table->foreign('empresa_id')->references('id')->on('empresa')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ia_chat_history');
    }
};
