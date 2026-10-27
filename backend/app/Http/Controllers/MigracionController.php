<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\MasterTemplateExport;

class MigracionController extends Controller
{
    // Bloque para descargar la plantilla Excel de migración de datos
    public function descargarPlantilla()
    {
        $user = Auth::user();
        if (!$user) return response()->json(["message" => "No autorizado"], 401);
        
        return Excel::download(new MasterTemplateExport(null, true), "Plantilla_Migracion_SaaS.xlsx");
    }

    // Bloque para generar y descargar el respaldo completo de la empresa en Excel
    public function descargarBackup()
    {
        $user = Auth::user();
        if (!$user || !$user->empresa_id) return response()->json(["message" => "No autorizado"], 401);
        
        return Excel::download(new MasterTemplateExport($user->empresa_id, false), "Backup_GestivaPyme_Empresa_" . $user->empresa_id . ".xlsx");
    }

    // Bloque para procesar y almacenar la solicitud de migración masiva de datos
    public function subirMigracion(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->empresa_id) return response()->json(["message" => "No autorizado"], 401);

        $request->validate([
            "archivo" => "required|file|mimes:xlsx,xls,csv"
        ]);

        // Bloque para almacenar el archivo en disco y generar la solicitud administrativa
        $file = $request->file("archivo");
        $path = $file->store("migraciones", "public");

        \App\Models\AdminRequest::create([
            "empresa_id" => $user->empresa_id,
            "tipo" => "migracion",
            "comprobante_path" => $path, // Guardamos el path del archivo para que el equipo lo procese
            "estado" => "pendiente",
            "datos_nuevos" => json_encode(["mensaje" => "Solicitud de importación masiva de datos (Excel)"])
        ]);

        return response()->json(["message" => "Archivo subido correctamente. El equipo técnico de GestivaPyme procesará la migración pronto."]);
    }
}
