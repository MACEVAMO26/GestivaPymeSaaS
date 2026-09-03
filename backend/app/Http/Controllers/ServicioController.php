<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Servicio;

class ServicioController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $empresaId = request()->header('X-Empresa-Id') ?? ($user?->empresa_id ?? null);
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $servicios = Servicio::with('categoria')
            ->where('empresa_id', $empresaId)
            ->where('activo', 1)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($servicios);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $empresaId = request()->header('X-Empresa-Id') ?? ($user?->empresa_id ?? null);
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $validated = $request->validate([
            'categoria_id' => 'nullable|exists:categorias,id',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'tarifa' => 'nullable|numeric|min:0',
            'tiempo_estimado' => 'nullable|string|max:100',
        ]);

        $servicio = Servicio::create([
            'empresa_id' => $empresaId,
            'categoria_id' => $validated['categoria_id'] ?? null,
            'nombre' => $validated['nombre'],
            'descripcion' => $validated['descripcion'] ?? null,
            'tarifa' => $validated['tarifa'] ?? null,
            'tiempo_estimado' => $validated['tiempo_estimado'] ?? null,
            'activo' => true,
        ]);

        return response()->json($servicio, 201);
    }

    public function show($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $servicio = Servicio::with('categoria')
            ->where('empresa_id', $user->empresa_id)
            ->findOrFail($id);

        return response()->json($servicio);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $servicio = Servicio::where('empresa_id', $user->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'categoria_id' => 'nullable|exists:categorias,id',
            'nombre' => 'sometimes|string|max:255',
            'descripcion' => 'nullable|string',
            'tarifa' => 'nullable|numeric|min:0',
            'tiempo_estimado' => 'nullable|string|max:100',
            'activo' => 'nullable|boolean',
        ]);

        $servicio->update($validated);

        return response()->json($servicio);
    }

    public function destroy(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $servicio = Servicio::where('empresa_id', $user->empresa_id)->findOrFail($id);
        $servicio->activo = 0;
        $servicio->inactive_at = now();
        $servicio->save();

        return response()->json(['message' => 'Servicio eliminado logicamente']);
    }
}
