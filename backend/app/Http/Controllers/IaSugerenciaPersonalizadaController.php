<?php

namespace App\Http\Controllers;

use App\Models\IaSugerenciaPersonalizada;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class IaSugerenciaPersonalizadaController extends Controller
{
    // Solo Gerente o Gerente General deberían tener acceso a esto, 
    // pero eso se puede controlar con un middleware o aquí mismo.
    private function checkGerente()
    {
        $user = Auth::user();
        if (!$user || !in_array($user->rol->nombre ?? '', ['Gerente General', 'Gerente'])) {
            abort(403, 'Acceso denegado. Solo para Gerencia.');
        }
        return $user;
    }

    public function index()
    {
        $user = clone $this->checkGerente();
        
        $sugerencias = IaSugerenciaPersonalizada::where('empresa_id', $user->empresa_id)
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($sugerencias);
    }

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

    public function destroy($id)
    {
        $user = clone $this->checkGerente();
        
        $sugerencia = IaSugerenciaPersonalizada::where('empresa_id', $user->empresa_id)->findOrFail($id);
        $sugerencia->delete();

        return response()->json(['message' => 'Directriz eliminada con éxito']);
    }
}
