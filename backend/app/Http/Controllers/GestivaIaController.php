<?php

namespace App\Http\Controllers;

use App\Services\IaService;
use Illuminate\Http\Request;

class GestivaIaController extends Controller
{
    protected $iaService;

    public function __construct(IaService $iaService)
    {
        $this->iaService = $iaService;
    }

    /**
     * Procesa la tarea enviada desde el botón flotante
     */
    public function procesarTarea(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string',
            'modo' => 'nullable|string|in:basico,avanzado',
            'empresa_id' => 'nullable|integer'
        ]);

        try {
            $modo = $request->input('modo', 'basico');
            $empresaId = $request->input('empresa_id'); // En producción esto debería venir del token JWT Auth::user()->empresa_id
            
            $respuesta = $this->iaService->processRequest($request->prompt, $modo, $empresaId);

            return response()->json([
                'success' => true,
                'data' => [
                    'respuesta' => $respuesta
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
