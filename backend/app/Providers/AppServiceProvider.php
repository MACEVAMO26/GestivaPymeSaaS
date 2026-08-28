<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Console\Events\CommandStarting;
use App\Models\User;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 1. ESCUDO DE PROTECCIÓN PARA EL USUARIO ADMINISTRADOR PRINCIPAL DEL SAAS
        User::deleting(function (User $user) {
            if ($user->email === 'gestivapyme@gmail.com') {
                throw new \RuntimeException("PROTECCIÓN CRÍTICA DE SEGURIDAD: El usuario Administrador Maestro (gestivapyme@gmail.com) no puede ser eliminado del sistema bajo ninguna circunstancia.");
            }
        });

        // 2. BLOQUEO DE COMANDOS DESTRUCTIVOS Y LIMPIEZAS DE BASE DE DATOS EN SUPABASE
        $dbHost = config('database.connections.pgsql.host', '');
        if (str_contains($dbHost, 'supabase') || app()->environment('production')) {
            // Nativo de Laravel 11
            DB::prohibitDestructiveCommands();

            // Interceptor de comandos de consola
            Event::listen(CommandStarting::class, function (CommandStarting $event) {
                $comandosProhibidos = ['db:seed', 'db:wipe', 'migrate:fresh', 'migrate:reset', 'migrate:rollback'];
                if (in_array($event->command, $comandosProhibidos)) {
                    throw new \RuntimeException(
                        "PROTECCIÓN DE SEGURIDAD: El comando '{$event->command}' está prohibido físicamente en código para proteger los datos vivos de los clientes y seeders de Supabase."
                    );
                }
            });
        }
    }
}

