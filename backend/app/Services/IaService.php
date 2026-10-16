<?php

namespace App\Services;

use App\Models\IaConfig;
use App\Models\IaChatHistory;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Crypt;

class IaService
{
    /**
     * Procesa la petición a la IA, gestionando el historial si es modo avanzado.
     */
    public function processRequest($prompt, $modo = 'basico', $empresaId = null)
    {
        $empresa = null;
        if ($empresaId) {
            $empresa = \App\Models\Empresa::find($empresaId);
        }

        $useByok = false;
        $apiKey = null;
        $proveedor = null;
        $modelo = null;

        // 1. Validar si la empresa tiene su propia API de IA (BYOK)
        if ($empresa && $empresa->ia_byok_activo && $empresa->ia_byok_key) {
            $useByok = true;
            $apiKey = Crypt::decryptString($empresa->ia_byok_key);
            $proveedor = $empresa->ia_byok_proveedor ?: 'gemini';
            $modelo = $empresa->ia_byok_modelo;
        }

        $user = auth()->user();
        $iaModo = $user ? $user->ia_modo : 'ninguno';

        // 2. Control de límites (si no usa su propia API Key)
        if (!$useByok) {
            if ($iaModo === 'ninguno') {
                throw new \Exception('Su usuario no tiene permisos habilitados para usar la Inteligencia Artificial.');
            }

            if ($iaModo === 'simple') {
                $consultasHoy = \App\Models\IaConsumoTokens::where('usuario_id', $user->id)
                    ->where('fecha', date('Y-m-d'))
                    ->where('modo', 'simple')
                    ->sum('cantidad_consultas');
                
                if ($consultasHoy >= 15) {
                    throw new \Exception('Has alcanzado tu límite diario de 15 consultas de IA Simple. Por favor, contacta al administrador para subir a Modo Avanzado o espera al día siguiente.');
                }
            }
        }

        // 3. Obtener credenciales globales si no es BYOK
        if (!$useByok) {
            $config = IaConfig::where('is_active', true)->first();
            if (!$config) {
                throw new \Exception('No hay ninguna IA configurada y activa en el sistema.');
            }
            $apiKey = Crypt::decryptString($config->api_key);
            $proveedor = $config->proveedor;
            $modelo = null;
        }

        // Obtener directrices activas de la empresa para que la IA las conozca y recuerde su cumplimiento
        $directricesTexto = "";
        if ($empresaId) {
            $directricesActivas = \App\Models\IaSugerenciaPersonalizada::where('empresa_id', $empresaId)
                ->where('activo', true)
                ->get();
            if ($directricesActivas->count() > 0) {
                $directricesTexto = "DIRECTRICES CORPORATIVAS VIGENTES ESTABLECIDAS POR LA GERENCIA:\n";
                foreach ($directricesActivas as $dir) {
                    $directricesTexto .= "- Para {$dir->audiencia}: \"{$dir->mensaje}\"\n";
                }
                $directricesTexto .= "\nInstrucción obligatoria de la Gerencia: Siempre que interactúes con el usuario, respondas dudas o propongas tareas, debes RECORDARLE y AVISARLE proactivamente sobre el cumplimiento de estas directrices de su rol.";
            }
        }

        // Historial de chat si es modo avanzado
        $messages = [];
        if ($modo === 'avanzado') {
            $systemContent = 'Eres Gestiva AI, el asistente virtual corporativo experto en ventas, contabilidad, gestión de tareas y servicios de la empresa. Responde de manera profesional, concisa, proactiva y amable.';
            if ($directricesTexto) {
                $systemContent .= "\n\n" . $directricesTexto;
            }
            $messages[] = [
                'role' => 'system',
                'content' => $systemContent
            ];

            $historial = IaChatHistory::where('empresa_id', $empresaId)
                ->orderBy('created_at', 'asc')
                ->take(10)
                ->get();

            foreach ($historial as $msg) {
                $role = $msg->rol === 'user' ? 'user' : 'assistant';
                $messages[] = [
                    'role' => $role,
                    'content' => $msg->mensaje
                ];
            }
        }

        $messages[] = [
            'role' => 'user',
            'content' => $prompt
        ];

        // 4. Llamada al proveedor de IA
        if ($proveedor === 'openai') {
            $resData = $this->callOpenAI($apiKey, $messages, $modelo);
        } else {
            $resData = $this->callGemini($apiKey, $messages, $modelo);
        }

        $respuesta = $resData['text'];

        // 5. Registro de consumos e historial (Solo si NO es BYOK)
        if (!$useByok && $user) {
            \App\Models\IaConsumoTokens::create([
                'empresa_id' => $user->empresa_id,
                'usuario_id' => $user->id,
                'modo' => $iaModo,
                'fecha' => date('Y-m-d'),
                'tokens_entrada' => $resData['tokens_entrada'],
                'tokens_salida' => $resData['tokens_salida'],
                'cantidad_consultas' => 1
            ]);
        }

        if ($modo === 'avanzado') {
            IaChatHistory::create([
                'empresa_id' => $empresaId,
                'rol' => 'user',
                'mensaje' => $prompt,
                'modo' => 'avanzado'
            ]);

            IaChatHistory::create([
                'empresa_id' => $empresaId,
                'rol' => 'assistant',
                'mensaje' => $respuesta,
                'modo' => 'avanzado'
            ]);
        }

        return $respuesta;
    }

    private function callOpenAI($apiKey, $messages, $modelo = null)
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey,
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => $modelo ?: 'gpt-3.5-turbo',
            'messages' => $messages,
        ]);

        if ($response->successful()) {
            return [
                'text' => $response->json('choices.0.message.content'),
                'tokens_entrada' => $response->json('usage.prompt_tokens') ?: 0,
                'tokens_salida' => $response->json('usage.completion_tokens') ?: 0
            ];
        }

        throw new \Exception('Error al contactar con OpenAI: ' . $response->body());
    }

    private function callGemini($apiKey, $messages, $modelo = null)
    {
        $contents = [];
        foreach ($messages as $msg) {
            if ($msg['role'] === 'system') {
                continue;
            }
            $role = $msg['role'] === 'assistant' ? 'model' : 'user';
            $contents[] = [
                'role' => $role,
                'parts' => [
                    ['text' => $msg['content']]
                ]
            ];
        }

        // Modelos oficiales de Google Generative AI en orden de compatibilidad y velocidad
        $modelosCandidatos = array_unique(array_filter([
            $modelo,
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-pro'
        ]));

        $ultimoError = '';

        foreach ($modelosCandidatos as $modeloUsado) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$modeloUsado}:generateContent?key=" . $apiKey;
            
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->timeout(25)->post($url, [
                'contents' => $contents,
            ]);

            if ($response->successful()) {
                return [
                    'text' => $response->json('candidates.0.content.parts.0.text'),
                    'tokens_entrada' => $response->json('usageMetadata.promptTokenCount') ?: 0,
                    'tokens_salida' => $response->json('usageMetadata.candidatesTokenCount') ?: 0
                ];
            }

            $ultimoError = $response->body();
        }

        throw new \Exception('Error al contactar con Gemini: ' . $ultimoError);
    }
}
