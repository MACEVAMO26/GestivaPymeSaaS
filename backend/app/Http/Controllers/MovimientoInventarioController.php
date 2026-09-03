<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\MovimientoInventario;

class MovimientoInventarioController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $empresaId = request()->header('X-Empresa-Id') ?? ($user->empresa_id ?? null);

        $movimientos = MovimientoInventario::with(['producto', 'usuario'])
            ->when($empresaId, function ($q) use ($empresaId) {
                $q->whereHas('producto', function ($pq) use ($empresaId) {
                    $pq->where('empresa_id', $empresaId);
                });
            })
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($m) {
                return [
                    'id' => $m->id,
                    'inventario_id' => $m->producto_id,
                    'producto_nombre' => $m->producto?->nombre ?? 'Producto #' . $m->producto_id,
                    'usuario_id' => $m->usuario_id,
                    'usuario_nombre' => $m->usuario?->name ?? 'Sistema',
                    'tipo_movimiento' => $m->tipo,
                    'cantidad' => $m->cantidad,
                    'observaciones' => $m->justificacion,
                    'fecha_hora' => $m->fecha_hora,
                ];
            });

        return response()->json($movimientos);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $validated = $request->validate([
            'inventario_id' => 'required|integer',
            'tipo_movimiento' => 'required|in:entrada,salida,ajuste,recepcion,venta',
            'cantidad' => 'required|integer',
            'observaciones' => 'nullable|string',
        ]);

        $movimiento = MovimientoInventario::create([
            'producto_id' => $validated['inventario_id'],
            'usuario_id' => $user->id,
            'tipo' => $validated['tipo_movimiento'],
            'cantidad' => $validated['cantidad'],
            'justificacion' => $validated['observaciones'] ?? null,
            'fecha_hora' => now(),
        ]);

        return response()->json([
            'id' => $movimiento->id,
            'inventario_id' => $movimiento->producto_id,
            'usuario_id' => $movimiento->usuario_id,
            'tipo_movimiento' => $movimiento->tipo,
            'cantidad' => $movimiento->cantidad,
            'observaciones' => $movimiento->justificacion,
            'fecha_hora' => $movimiento->fecha_hora,
        ], 201);
    }
}
