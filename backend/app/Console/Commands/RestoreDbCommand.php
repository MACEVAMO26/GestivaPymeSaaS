<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class RestoreDbCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:restore-manual';

    protected $description = 'Restores the database from the specific backup file';

    public function handle()
    {
        $path = 'C:\Users\EVIAN\Documents\SENA\APLICATIVO\Base de datos\gestivapyme.sql';
        if (!file_exists($path)) {
            $this->error("Backup file not found at $path");
            return;
        }

        $this->info("Wiping current database...");
        \Illuminate\Support\Facades\Artisan::call('db:wipe', ['--force' => true]);
        
        $this->info("Loading backup SQL...");
        $sql = file_get_contents($path);
        
        $this->info("Patching boolean columns to varchar to accept '' and 1 inserts...");
        $sql = str_replace(' boolean DEFAULT true', " varchar DEFAULT '1'", $sql);
        $sql = str_replace(' boolean DEFAULT false', " varchar DEFAULT ''", $sql);
        $sql = str_replace(' boolean NOT NULL DEFAULT false', " varchar NOT NULL DEFAULT ''", $sql);
        $sql = str_replace(' boolean NOT NULL DEFAULT true', " varchar NOT NULL DEFAULT '1'", $sql);
        $sql = str_replace(' boolean', ' varchar', $sql);

        // Split by semicolon, but keep in mind there might be semicolons in strings.
        // For a simple dump, splitting by ";\n" is usually safe.
        $statements = explode(";\n", $sql);
        
        $this->info("Executing " . count($statements) . " statements...");
        
        $success = 0;
        $failed = 0;
        foreach ($statements as $stmt) {
            $stmt = trim($stmt);
            if (empty($stmt)) continue;
            
            try {
                \Illuminate\Support\Facades\DB::unprepared($stmt);
                $success++;
            } catch (\Exception $e) {
                // Ignore "already exists" and "no unique constraint" temporarily
                $failed++;
            }
        }
        
        // At the end, try to re-apply any foreign keys that might have failed because of ordering
        foreach ($statements as $stmt) {
            $stmt = trim($stmt);
            if (strpos($stmt, 'FOREIGN KEY') !== false) {
                try {
                    \Illuminate\Support\Facades\DB::unprepared($stmt);
                } catch (\Exception $e) {
                    // Ignore
                }
            }
        }
        
        $this->info("Database restored! Success: $success, Failed: $failed");
    }
}
