<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use App\Models\IaConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

class IaConfigController extends Controller
{
    /**
     * Devuelve la configuración de IA de una empresa específica.
     * Si no se pasa empresa_id, devuelve la config global activa (legado).
     */
    public function index(Request $request)
    {
        $empresaId = $request->query('empresa_id');

        if ($empresaId) {
            $empresa = Empresa::find($empresaId);

            if (!$empresa) {
                return response()->json(['success' => false, 'message' => 'Empresa no encontrada.'], 404);
            }

            $tareasDefault = ['resumir' => false, 'redactar' => false, 'analizar' => false, 'automatizar' => false];
            $tareas = is_array($empresa->ia_byok_tareas) ? array_merge($tareasDefault, $empresa->ia_byok_tareas) : $tareasDefault;

            // Clave censurada: muestra ******** + últimos 4 caracteres reales
            $claveCensurada = null;
            if ($empresa->ia_byok_key) {
                try {
                    $claveReal = Crypt::decryptString($empresa->ia_byok_key);
                    $claveCensurada = '********' . substr($claveReal, -4);
                } catch (\Exception $e) {
                    $claveCensurada = '********';
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'fuente'    => $empresa->ia_fuente ?? 'gestivapyme',
                    'proveedor' => $empresa->ia_byok_proveedor ?? 'gemini',
                    'modo'      => $empresa->ia_byok_modo ?? 'apagado',
                    'api_key'   => $claveCensurada,
                    'tareas'    => $tareas,
                    'tiene_llave' => !empty($empresa->ia_byok_key),
                ]
            ]);
        }

        // --- Config global (legado) ---
        $config = IaConfig::where('is_active', true)->first();

        if ($config) {
            try {
                $claveReal = Crypt::decryptString($config->api_key);
                $claveCensurada = '********' . substr($claveReal, -4);
            } catch (\Exception $e) {
                $claveCensurada = '********';
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'fuente'    => 'gestivapyme',
                    'proveedor' => $config->proveedor,
                    'modo'      => $config->modo,
                    'api_key'   => $claveCensurada,
                    'tareas'    => ['resumir' => false, 'redactar' => false, 'analizar' => false, 'automatizar' => false],
                    'tiene_llave' => !empty($config->api_key),
                ]
            ]);
        }

        return response()->json(['success' => true, 'data' => null]);
    }

    /**
     * Guarda la configuración de IA de una empresa.
     * Si se manda empresa_id, guarda en la tabla empresa.
     * Si no, guarda en ia_configs (config global, legado).
     */
    public function store(Request $request)
    {
        $request->validate([
            'empresa_id' => 'nullable|integer|exists:empresa,id',
            'fuente'     => 'nullable|string|in:gestivapyme,propia',
            'proveedor'  => 'nullable|string|in:openai,gemini,claude,personalizada',
            'api_key'    => 'nullable|string',
            'modo'       => 'nullable|string|in:apagado,simple,avanzado',
            'tareas'     => 'nullable|array',
            'tareas.resumir'      => 'nullable|boolean',
            'tareas.redactar'     => 'nullable|boolean',
            'tareas.analizar'     => 'nullable|boolean',
            'tareas.automatizar'  => 'nullable|boolean',
        ]);

        $mantenerLlave = $request->boolean('mantener_llave');
        $fuente        = $request->input('fuente', 'gestivapyme');
        $modo          = $request->input('modo', 'apagado');
        $tareas        = $request->input('tareas', ['resumir' => false, 'redactar' => false, 'analizar' => false, 'automatizar' => false]);

        // Validar que si es propia y no apagado, debe tener llave
        if ($fuente === 'propia' && $modo !== 'apagado' && !$mantenerLlave && !$request->filled('api_key')) {
            return response()->json([
                'success' => false,
                'message' => 'Debes ingresar una API Key para habilitar la IA propia.'
            ], 422);
        }

        if ($request->filled('empresa_id')) {
            $empresa = Empresa::find($request->empresa_id);

            if (!$empresa) {
                return response()->json(['success' => false, 'message' => 'Empresa no encontrada.'], 404);
            }

            $empresa->ia_fuente        = $fuente;
            $empresa->ia_byok_activo   = ($fuente === 'propia' && $modo !== 'apagado');
            $empresa->ia_byok_proveedor = $request->input('proveedor', 'gemini');
            $empresa->ia_byok_modo     = $modo;
            $empresa->ia_byok_tareas   = $tareas;

            if (!$mantenerLlave && $request->filled('api_key')) {
                $empresa->ia_byok_key = Crypt::encryptString($request->api_key);
            } elseif ($fuente === 'gestivapyme') {
                // Si elige la IA de GestivaPyme, borramos la clave propia
                $empresa->ia_byok_key = null;
            }

            $empresa->save();

            return response()->json([
                'success' => true,
                'message' => 'Configuración de IA guardada correctamente para la empresa.'
            ]);
        }

        // --- Config global (legado) ---
        IaConfig::where('is_active', true)->update(['is_active' => false]);

        $config = IaConfig::where('proveedor', $request->proveedor)->first();
        $data = ['modo' => $modo, 'is_active' => true];

        if (!$mantenerLlave) {
            $data['api_key'] = $request->filled('api_key') ? Crypt::encryptString($request->api_key) : '';
        }

        if ($config) {
            $config->update($data);
        } else {
            IaConfig::create(array_merge($data, ['proveedor' => $request->proveedor]));
        }

        return response()->json([
            'success' => true,
            'message' => 'Configuración de IA global guardada correctamente.'
        ]);
    }
}
