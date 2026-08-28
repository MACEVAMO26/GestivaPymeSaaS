<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\MasterTemplateExport;
// use App\Imports\MasterDataImport; // We will create this later if needed

class MigracionController extends Controller
{
    public function descargarPlantilla()
    {
        $user = Auth::user();
        if (!$user) return response()->json(["message" => "No autorizado"], 401);
        
        return Excel::download(new MasterTemplateExport(null, true), "Plantilla_Migracion_SaaS.xlsx");
    }

    public function descargarBackup()
    {
        $user = Auth::user();
        if (!$user || !$user->empresa_id) return response()->json(["message" => "No autorizado"], 401);
        
        return Excel::download(new MasterTemplateExport($user->empresa_id, false), "Backup_GestivaPyme_Empresa_" . $user->empresa_id . ".xlsx");
    }

    public function subirMigracion(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->empresa_id) return response()->json(["message" => "No autorizado"], 401);

        $request->validate([
            "archivo" => "required|file|mimes:xlsx,xls,csv"
        ]);

        // Aqui podemos delegar a un import, o simplemente guardar el archivo para que el Admin SaaS lo procese
        // Vamos a guardar el archivo en storage y crear un "AdminRequest"
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
