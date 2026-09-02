<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Proveedor;

class ProveedorController extends Controller
{
public function index()
    {
        $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $proveedores = Proveedor::where('empresa_id', $empresaId)
            ->where('activo', 1)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($proveedores);
    }

public function store(Request $request)
    {
        $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $validated = $request->validate([
            'razon_social' => 'required|string|max:255',
            'nit' => 'required|string|max:50',
            'contacto' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'direccion' => 'nullable|string|max:255',
            'documentos_url' => 'nullable|string|max:255',
            'calificacion' => 'nullable|integer|min:0|max:5',
            'comentarios_evaluacion' => 'nullable|string',
            'estado_evaluacion' => 'nullable|string|max:50',
        ]);

        // Verificar si el NIT ya existe para esta empresa
        $exists = Proveedor::where('empresa_id', $empresaId)->where('nit', $validated['nit'])->first();
        if ($exists) {
            return response()->json(['message' => 'El NIT/Documento ya ha sido registrado para esta empresa.'], 422);
        }

        $validated['empresa_id'] = $empresaId;
        $validated['activo'] = 1;

        $proveedor = Proveedor::create($validated);

        return response()->json($proveedor, 201);
    }

    // Actualiza la información de un proveedor o su evaluación de desempeño
    public function update(Request $request, $id)
    {
        $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $proveedor = Proveedor::where('empresa_id', $empresaId)->findOrFail($id);

        $validated = $request->validate([
            'razon_social' => 'sometimes|required|string|max:255',
            'nit' => 'sometimes|required|string|max:50',
            'contacto' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'direccion' => 'nullable|string|max:255',
            'documentos_url' => 'nullable|string|max:255',
            'calificacion' => 'nullable|integer|min:0|max:5',
            'comentarios_evaluacion' => 'nullable|string',
            'estado_evaluacion' => 'nullable|string|max:50',
        ]);

        // Verificar si el nuevo NIT ya existe para esta misma empresa
        if (isset($validated['nit']) && $validated['nit'] !== $proveedor->nit) {
            $exists = Proveedor::where('empresa_id', $empresaId)->where('nit', $validated['nit'])->first();
            if ($exists) {
                return response()->json(['message' => 'El NIT/Documento ya ha sido registrado para esta empresa.'], 422);
            }
        }

        $proveedor->update($validated);

        return response()->json($proveedor);
    }

    // Inactiva lógicamente un proveedor
    public function destroy(Request $request, $id)
    {
        $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $proveedor = Proveedor::where('empresa_id', $empresaId)->findOrFail($id);
        // Borrado lógico
        $proveedor->activo = 0;
        $proveedor->inactive_at = now();
        $proveedor->save();

        return response()->json(['message' => 'Proveedor eliminado logicamente']);
    }
}
