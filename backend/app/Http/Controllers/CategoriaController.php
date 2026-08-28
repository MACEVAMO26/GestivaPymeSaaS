<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Categoria;

class CategoriaController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $categorias = Categoria::where('empresa_id', $user->empresa_id)
            ->where('activo', 1)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($categorias);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'tipo' => 'nullable|in:ventas,servicios,ventas y servicios',
        ]);

        $categoria = Categoria::create([
            'empresa_id' => $user->empresa_id,
            'nombre' => $validated['nombre'],
            'descripcion' => $validated['descripcion'] ?? null,
            'tipo' => $validated['tipo'] ?? 'ventas',
            'activo' => true,
        ]);

        return response()->json($categoria, 201);
    }

    public function show($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $categoria = Categoria::where('empresa_id', $user->empresa_id)->findOrFail($id);
        return response()->json($categoria);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $categoria = Categoria::where('empresa_id', $user->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'nombre' => 'sometimes|string|max:255',
            'descripcion' => 'nullable|string',
            'tipo' => 'nullable|in:ventas,servicios,ventas y servicios',
            'activo' => 'nullable|boolean',
        ]);

        $categoria->update($validated);

        return response()->json($categoria);
    }

    public function destroy(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $categoria = Categoria::where('empresa_id', $user->empresa_id)->findOrFail($id);
        $categoria->activo = 0;
        $categoria->inactive_at = now();
        $categoria->save();

        return response()->json(['message' => 'Categoria eliminada logicamente']);
    }
}
