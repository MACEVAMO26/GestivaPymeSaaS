<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Area;

class AreaController extends Controller
{
    // Trae las areas de la empresa del usuario con sus modulos
    public function index()
    {
        $empresaId = auth()->user()->empresa_id;
        return response()->json(Area::with('modulos')->where('empresa_id', $empresaId)->get());
    }

    // Para guardar una nueva área
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'modulos' => 'nullable|array',
        ]);

        $area = Area::create([
            'nombre' => $validated['nombre'],
            'descripcion' => $validated['descripcion'] ?? null,
            'empresa_id' => auth()->user()->empresa_id,
        ]);

        if (isset($validated['modulos'])) {
            $area->modulos()->sync($validated['modulos']);
        }

        $area->load('modulos');
        return response()->json($area, 201);
    }

    // Para actualizar un área
    public function update(Request $request, $id)
    {
        $area = Area::where('id', $id)
            ->where('empresa_id', auth()->user()->empresa_id)
            ->firstOrFail();

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'activo' => 'boolean',
            'modulos' => 'nullable|array',
        ]);

        $area->update([
            'nombre' => $validated['nombre'],
            'descripcion' => $validated['descripcion'] ?? null,
            'activo' => $validated['activo'] ?? $area->activo,
        ]);

        if (isset($validated['modulos'])) {
            $area->modulos()->sync($validated['modulos']);
        }

        $area->load('modulos');
        return response()->json($area);
    }

    // Para inactivar o activar un área
    public function changeStatus($id)
    {
        $area = Area::where('id', $id)
            ->where('empresa_id', auth()->user()->empresa_id)
            ->firstOrFail();

        $area->activo = !$area->activo;
        $area->save();

        return response()->json(['message' => 'Estado del área actualizado', 'activo' => $area->activo]);
    }
}
