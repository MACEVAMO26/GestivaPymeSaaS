<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Proveedor;

class ProveedorController extends Controller
{
    // Bloque para listar los proveedores activos de la empresa autenticada
    public function index()
    {
        $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);
        if (!$empresaId) {
            $empresaId = 6;
        }

        $proveedores = Proveedor::where('empresa_id', $empresaId)
            ->where(function ($q) {
                $q->whereNull('activo')
                  ->orWhereIn('activo', ['1', 'true', 'activo', 'Si', 'si', 'ACTIVO']);
            })
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($proveedores);
    }

    // Bloque para registrar un nuevo proveedor comercial en el sistema
    public function store(Request $request)
    {
        $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        // Bloque de reglas de validación
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

        // Bloque de verificación de unicidad de NIT por empresa
        $exists = Proveedor::where('empresa_id', $empresaId)->where('nit', $validated['nit'])->first();
        if ($exists) {
            return response()->json(['message' => 'El NIT/Documento ya ha sido registrado para esta empresa.'], 422);
        }

        $validated['empresa_id'] = $empresaId;
        $validated['activo'] = '1';

        // Bloque de guardado en BD
        $proveedor = Proveedor::create($validated);

        return response()->json($proveedor, 201);
    }

    // Bloque para actualizar la información comercial y evaluación del proveedor
    public function update(Request $request, $id)
    {
        $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $proveedor = Proveedor::where('empresa_id', $empresaId)->findOrFail($id);

        // Bloque de reglas de validación
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

        // Bloque de verificación de unicidad de NIT en actualización
        if (isset($validated['nit']) && $validated['nit'] !== $proveedor->nit) {
            $exists = Proveedor::where('empresa_id', $empresaId)->where('nit', $validated['nit'])->first();
            if ($exists) {
                return response()->json(['message' => 'El NIT/Documento ya ha sido registrado para esta empresa.'], 422);
            }
        }

        // Bloque de guardado en BD
        $proveedor->update($validated);

        return response()->json($proveedor);
    }

    // Bloque para inactivar lógicamente un proveedor del sistema
    public function destroy(Request $request, $id)
    {
        $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);
        if (!$empresaId) {
            return response()->json(['error' => 'Empresa no especificada'], 400);
        }

        $proveedor = Proveedor::where('empresa_id', $empresaId)->findOrFail($id);
        $proveedor->activo = '0';
        $proveedor->inactive_at = now();
        // Bloque de guardado en BD
        $proveedor->save();

        return response()->json(['message' => 'Proveedor eliminado logicamente']);
    }
}
