<?php

namespace App\Http\Controllers;

use App\Models\Inventario;
use Illuminate\Http\Request;

class InventarioController extends Controller
{
    // --- GESTIÓN DE INVENTARIO ---
    // Obtiene la lista de inventario incluyendo los detalles del producto asociado
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

    // Registra una nueva entrada en el inventario inicializando cantidades
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'producto_id' => 'required|integer|exists:productos,id',
            'stock_actual' => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
            'bodega' => 'nullable|string|max:255',
            'estante' => 'nullable|string|max:255',
            'posicion' => 'nullable|string|max:255',
        ]);

        $inventario = Inventario::create($validatedData);
        return response()->json($inventario, 201);
    }

    // Retorna los detalles de un registro específico de inventario
    public function show($id)
    {
        return Inventario::with('producto')->findOrFail($id);
    }

    // Actualiza las cantidades y datos de ubicación de un registro de inventario
    public function update(Request $request, $id)
    {
        $inventario = Inventario::findOrFail($id);

        $validatedData = $request->validate([
            'producto_id' => 'required|integer|exists:productos,id',
            'stock_actual' => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
            'bodega' => 'nullable|string|max:255',
            'estante' => 'nullable|string|max:255',
            'posicion' => 'nullable|string|max:255',
        ]);

        $inventario->update($validatedData);
        return response()->json($inventario);
    }

    // Elimina permanentemente un registro de inventario del sistema
    public function destroy($id)
    {
        $inventario = Inventario::findOrFail($id);
        
        $inventario->delete();

        return response()->json(['message' => 'Registro de inventario eliminado permanentemente.'], 200);
    }
}