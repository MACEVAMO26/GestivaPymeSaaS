<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Categoria;

class CategoriaController extends Controller
{
    // Bloque para listar las categorías activas de la empresa autenticada
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $categorias = Categoria::where('empresa_id', $user->empresa_id)
            ->whereIn('activo', ['1', 'true'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($categorias);
    }

    // Bloque para registrar una nueva categoría de productos o servicios
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        // Bloque de reglas de validación
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'tipo' => 'nullable|in:ventas,servicios,ventas y servicios',
        ]);

        // Bloque de guardado en BD
        $categoria = Categoria::create([
            'empresa_id' => $user->empresa_id,
            'nombre' => $validated['nombre'],
            'descripcion' => $validated['descripcion'] ?? null,
            'tipo' => $validated['tipo'] ?? 'ventas',
            'activo' => true,
        ]);

        return response()->json($categoria, 201);
    }

    // Bloque para consultar el detalle de una categoría específica
    public function show($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $categoria = Categoria::where('empresa_id', $user->empresa_id)->findOrFail($id);
        return response()->json($categoria);
    }

    // Bloque para actualizar la información de una categoría existente
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $categoria = Categoria::where('empresa_id', $user->empresa_id)->findOrFail($id);

        // Bloque de reglas de validación
        $validated = $request->validate([
            'nombre' => 'sometimes|string|max:255',
            'descripcion' => 'nullable|string',
            'tipo' => 'nullable|in:ventas,servicios,ventas y servicios',
            'activo' => 'nullable|boolean',
        ]);

        // Bloque de guardado en BD
        $categoria->update($validated);

        return response()->json($categoria);
    }

    // Bloque para inactivar lógicamente una categoría del sistema
    public function destroy(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $categoria = Categoria::where('empresa_id', $user->empresa_id)->findOrFail($id);
        $categoria->activo = 0;
        $categoria->inactive_at = now();
        // Bloque de guardado en BD
        $categoria->save();

        return response()->json(['message' => 'Categoria eliminada logicamente']);
    }
}
