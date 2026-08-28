<?php
namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;

class ImpersonateController extends Controller
{
    public function impersonateAuditor(Request $request, $empresaId)
    {
        $saasAdmin = auth()->user();
        if (!$saasAdmin || $saasAdmin->empresa_id !== null) {
            return response()->json(["error" => "No autorizado"], 403);
        }

        $rolAuditor = Role::firstOrCreate(
            ["empresa_id" => $empresaId, "nombre" => "Auditor"],
            ["descripcion" => "Auditor del sistema", "activo" => true]
        );

        $auditorEmail = "auditor_" . $empresaId . "@gestivapyme.com";
        $auditor = User::firstOrCreate(
            ["email" => $auditorEmail],
            [
                "empresa_id" => $empresaId,
                "rol_id" => $rolAuditor->id,
                "primer_nombre" => "Auditor",
                "primer_apellido" => "Sistema",
                "tipo_documento" => "CC",
                "documento" => "AUD" . $empresaId,
                "email_personal" => "soporte@gestivapyme.com",
                "password_hash" => \Hash::make(\Str::random(16)),
                "activo" => true,
                "perfil_formalizado" => true,
                "debe_cambiar_clave" => false
            ]
        );

        
        $auditor->load(["empresa", "rol"]);
        $token = $auditor->createToken("auth_token")->plainTextToken;

        // Fetch modulos activos to mimic standard login
        $modulosActivos = [];
        $modulos = \Illuminate\Support\Facades\DB::table("empresa_modulo")
                    ->where("empresa_id", $empresaId)
                    ->get();
        foreach ($modulos as $mod) {
            $modulosActivos[$mod->modulo_id] = (bool) $mod->activo;
        }

        return response()->json([
            "token" => $token,
            "user" => $auditor,
            "modulos_activos" => $modulosActivos
        ]);
    }
}

