<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SaasContrato;
use App\Models\Empresa;
use App\Models\Notificacion;

class SaasContratoController extends Controller
{
    // Bloque para consultar el historial de versiones del contrato SaaS
    public function index()
    {
        $contratos = SaasContrato::orderBy('created_at', 'desc')->get();
        return response()->json($contratos);
    }

    // Bloque para consultar la versión vigente del contrato SaaS
    public function activo()
    {
        $contrato = SaasContrato::where('es_activo', true)->first();
        if (!$contrato) {
            return response()->json(['message' => 'No hay contrato activo'], 404);
        }
        return response()->json($contrato);
    }

    // Bloque para registrar una nueva versión del contrato SaaS y notificar a los clientes
    public function store(Request $request)
    {
        $request->validate([
            'contenido' => 'required|string',
            'version' => 'required|string',
        ]);

        // Bloque para desactivar la versión anterior del contrato
        SaasContrato::where('es_activo', true)->update(['es_activo' => false]);

        // Bloque para crear y persistir la nueva versión del contrato
        $nuevoContrato = SaasContrato::create([
            'contenido' => $request->contenido,
            'version' => $request->version,
            'es_activo' => true
        ]);

        // Bloque para notificar a los gerentes de empresas activas sobre la nueva versión
        $empresas = Empresa::where('activo', 1)->get();
        $notificacionesCreadas = 0;

        foreach ($empresas as $empresa) {
            // Bloque para consultar los usuarios con rol de Gerente de la empresa
            $gerentes = \App\Models\User::where('empresa_id', $empresa->id)
                ->whereHas('rol', function($q) {
                    $q->where('nombre', 'like', '%Gerente%');
                })->get();
            
            foreach ($gerentes as $gerente) {
                Notificacion::create([
                    'usuario_id' => $gerente->id,
                    'titulo' => 'Actualización de Contrato de Servicio',
                    'descripcion' => 'Se ha publicado una nueva versión (v' . $nuevoContrato->version . ') del contrato SAAS. Por favor revise y firme las nuevas políticas.',
                    'leida' => false
                ]);
                $notificacionesCreadas++;
            }
        }

        return response()->json([
            'message' => 'Contrato publicado con éxito y gerentes notificados.',
            'contrato' => $nuevoContrato,
            'notificaciones_enviadas' => $notificacionesCreadas
        ]);
    }
    // Bloque para registrar la firma digital del contrato por parte del gerente
    public function firmar(Request $request)
    {
        $request->validate([
            'contrato_id' => 'required|exists:saas_contratos,id',
            'firma_base64' => 'required|string', // Aquí recibiremos el base64 del canvas de firma
        ]);

        $user = auth()->user();
        if (!$user || !$user->empresa_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $empresa = Empresa::find($user->empresa_id);
        if (!$empresa) {
            return response()->json(['message' => 'Empresa no encontrada'], 404);
        }

        // Bloque de persistencia de firma digital y datos de auditoría
        $empresa->contrato_id = $request->contrato_id;
        $empresa->fecha_firma = now();
        $empresa->firma_gerente_url = $request->firma_base64; 
        $empresa->contrato_aceptado = true;
        $empresa->contrato_fecha_aceptacion = now();
        $empresa->contrato_ip_aceptacion = $request->ip();
        $empresa->contrato_firma_path = $request->firma_base64;

        $empresa->save();

        return response()->json([
            'message' => 'Contrato firmado con éxito.',
            'fecha_firma' => $empresa->fecha_firma,
            'firma_gerente_url' => $empresa->firma_gerente_url
        ]);
    }
}
