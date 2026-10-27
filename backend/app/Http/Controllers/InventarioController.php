<?php

namespace App\Http\Controllers;

use App\Models\Inventario;
use Illuminate\Http\Request;

class InventarioController extends Controller
{
    // Bloque para listar las existencias de inventario con datos del producto asociado
    public function index()
    {
        $empresaId = request()->header('X-Empresa-Id') ?? (auth()->user()?->empresa_id ?? null);
        return Inventario::with('producto')
            ->when($empresaId, function ($q) use ($empresaId) {
                $q->whereHas('producto', function ($pq) use ($empresaId) {
                    $pq->where('empresa_id', $empresaId);
                });
            })
            ->get();
    }

    // Bloque para registrar un nuevo registro de inventario y ubicación
    public function store(Request $request)
    {
        // Bloque de reglas de validación
        $validatedData = $request->validate([
            'producto_id' => 'required|integer|exists:productos,id',
            'stock_actual' => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
            'bodega' => 'nullable|string|max:255',
            'estante' => 'nullable|string|max:255',
            'posicion' => 'nullable|string|max:255',
        ]);

        // Bloque de guardado en BD
        $inventario = Inventario::create($validatedData);
        return response()->json($inventario, 201);
    }

    // Bloque para consultar el detalle de un registro específico de inventario
    public function show($id)
    {
        return Inventario::with('producto')->findOrFail($id);
    }

    // Bloque para actualizar existencias y ubicación de un registro de inventario
    public function update(Request $request, $id)
    {
        $inventario = Inventario::findOrFail($id);

        // Bloque de reglas de validación
        $validatedData = $request->validate([
            'producto_id' => 'required|integer|exists:productos,id',
            'stock_actual' => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
            'bodega' => 'nullable|string|max:255',
            'estante' => 'nullable|string|max:255',
            'posicion' => 'nullable|string|max:255',
        ]);

        // Bloque de guardado en BD
        $inventario->update($validatedData);
        return response()->json($inventario);
    }

    // Bloque para eliminar un registro de inventario del sistema
    public function destroy($id)
    {
        $inventario = Inventario::findOrFail($id);
        
        $inventario->delete();

        return response()->json(['message' => 'Registro de inventario eliminado permanentemente.'], 200);
    }
}
