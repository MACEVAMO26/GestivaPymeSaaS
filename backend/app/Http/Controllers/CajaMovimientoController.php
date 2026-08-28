<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Caja;
use App\Models\CajaMovimiento;

class CajaMovimientoController extends Controller
{
    public function index($cajaId)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        Caja::where('empresa_id', $user->empresa_id)->findOrFail($cajaId);

        $movimientos = CajaMovimiento::where('caja_id', $cajaId)
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($m) {
                return [
                    'id' => $m->id,
                    'caja_id' => $m->caja_id,
                    'tipo' => $m->tipo,
                    'monto' => $m->monto,
                    'concepto' => $m->concepto,
                    'comprobante_url' => $m->comprobante,
                ];
            });

        return response()->json($movimientos);
    }

    public function store(Request $request, $cajaId)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $caja = Caja::where('empresa_id', $user->empresa_id)->findOrFail($cajaId);

        $validated = $request->validate([
            'tipo' => 'required|in:apertura,ingreso,egreso,cierre',
            'monto' => 'required|numeric|min:0',
            'concepto' => 'required|string|max:255',
            'comprobante_url' => 'nullable|string|max:500',
        ]);

        $movimiento = CajaMovimiento::create([
            'caja_id' => $cajaId,
            'tipo' => $validated['tipo'],
            'monto' => $validated['monto'],
            'concepto' => $validated['concepto'],
            'comprobante' => $validated['comprobante_url'] ?? null,
        ]);

        return response()->json([
            'id' => $movimiento->id,
            'caja_id' => $movimiento->caja_id,
            'tipo' => $movimiento->tipo,
            'monto' => $movimiento->monto,
            'concepto' => $movimiento->concepto,
            'comprobante_url' => $movimiento->comprobante,
        ], 201);
    }
}
