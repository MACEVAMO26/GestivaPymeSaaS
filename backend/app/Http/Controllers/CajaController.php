<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Caja;
use App\Models\CajaMovimiento;

class CajaController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $cajas = Caja::where('empresa_id', $user->empresa_id)
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($caja) {
                return $this->mapCaja($caja);
            });

        return response()->json($cajas);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $validated = $request->validate([
            'base_inicial' => 'required|numeric|min:0',
            'observaciones' => 'nullable|string',
        ]);

        $caja = Caja::create([
            'empresa_id' => $user->empresa_id,
            'usuario_apertura' => $user->id,
            'saldo_inicial' => $validated['base_inicial'],
            'abierta_en' => now(),
            'estado' => 'abierta',
        ]);

        CajaMovimiento::create([
            'caja_id' => $caja->id,
            'tipo' => 'apertura',
            'monto' => $validated['base_inicial'],
            'concepto' => 'Apertura de caja',
        ]);

        return response()->json($this->mapCaja($caja), 201);
    }

    public function abrir(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $validated = $request->validate([
            'base_inicial' => 'required|numeric|min:0',
            'observaciones' => 'nullable|string',
        ]);

        $caja = Caja::where('empresa_id', $user->empresa_id)->findOrFail($id);

        $caja->estado = 'abierta';
        $caja->usuario_apertura = $user->id;
        $caja->saldo_inicial = $validated['base_inicial'];
        $caja->abierta_en = now();
        $caja->save();

        CajaMovimiento::create([
            'caja_id' => $caja->id,
            'tipo' => 'apertura',
            'monto' => $validated['base_inicial'],
            'concepto' => 'Apertura de caja',
        ]);

        return response()->json($this->mapCaja($caja));
    }

    public function cerrar(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $validated = $request->validate([
            'saldo_final' => 'required|numeric|min:0',
            'observaciones' => 'nullable|string',
        ]);

        $caja = Caja::where('empresa_id', $user->empresa_id)->findOrFail($id);

        $caja->estado = 'cerrada';
        $caja->usuario_cierre = $user->id;
        $caja->saldo_final = $validated['saldo_final'];
        $caja->cerrada_en = now();
        $caja->save();

        CajaMovimiento::create([
            'caja_id' => $caja->id,
            'tipo' => 'cierre',
            'monto' => $validated['saldo_final'],
            'concepto' => 'Cierre de caja',
        ]);

        return response()->json($this->mapCaja($caja));
    }

    private function mapCaja($caja)
    {
        return [
            'id' => $caja->id,
            'usuario_id' => $caja->usuario_apertura ?? $caja->usuario_cierre,
            'fecha_apertura' => $caja->abierta_en,
            'fecha_cierre' => $caja->cerrada_en,
            'base_inicial' => $caja->saldo_inicial,
            'saldo_final' => $caja->saldo_final,
            'estado' => $caja->estado,
        ];
    }
}
