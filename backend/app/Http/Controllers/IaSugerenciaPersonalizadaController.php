<?php

namespace App\Http\Controllers;

use App\Models\IaSugerenciaPersonalizada;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class IaSugerenciaPersonalizadaController extends Controller
{
    // Bloque de verificación de permisos exclusivos para Gerencia
    
    private function checkGerente()
    {
        $user = Auth::user();
        if (!$user || !in_array($user->rol->nombre ?? '', ['Gerente General', 'Gerente'])) {
            abort(403, 'Acceso denegado. Solo para Gerencia.');
        }
        return $user;
    }

    // Bloque para listar las directrices personalizadas de IA de la empresa
    public function index()
    {
        $user = clone $this->checkGerente();
        
        $sugerencias = IaSugerenciaPersonalizada::where('empresa_id', $user->empresa_id)
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($sugerencias);
    }

    // Bloque para registrar una nueva directriz personalizada de IA
    public function store(Request $request)
    {
        $user = clone $this->checkGerente();

        $request->validate([
            'mensaje' => 'required|string|max:500',
            'audiencia' => 'required|string',
            'activo' => 'boolean'
        ]);

        $sugerencia = IaSugerenciaPersonalizada::create([
            'empresa_id' => $user->empresa_id,
            'mensaje' => $request->mensaje,
            'audiencia' => $request->audiencia,
            'activo' => $request->activo ?? true,
        ]);

        return response()->json(['message' => 'Directriz de IA creada con éxito', 'data' => $sugerencia], 201);
    }

    // Bloque para actualizar una directriz personalizada de IA
    public function update(Request $request, $id)
    {
        $user = clone $this->checkGerente();

        $request->validate([
            'mensaje' => 'string|max:500',
            'audiencia' => 'string',
            'activo' => 'boolean'
        ]);

        $sugerencia = IaSugerenciaPersonalizada::where('empresa_id', $user->empresa_id)->findOrFail($id);
        $sugerencia->update($request->only(['mensaje', 'audiencia', 'activo']));

        return response()->json(['message' => 'Directriz de IA actualizada con éxito', 'data' => $sugerencia]);
    }

    // Bloque para eliminar una directriz personalizada de IA
    public function destroy($id)
    {
        $user = clone $this->checkGerente();
        
        $sugerencia = IaSugerenciaPersonalizada::where('empresa_id', $user->empresa_id)->findOrFail($id);
        $sugerencia->delete();

        return response()->json(['message' => 'Directriz eliminada con éxito']);
    }
}
