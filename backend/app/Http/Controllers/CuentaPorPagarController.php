<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CuentaPorPagar;
use App\Models\Proveedor;

class CuentaPorPagarController extends Controller
{
    // Lista las cuentas por pagar de la empresa autenticada (con datos del proveedor)
    public function index()
    {
        $empresaId = auth()->user()?->empresa_id;

        $cuentas = CuentaPorPagar::with('proveedor')
            ->when($empresaId, function ($q) use ($empresaId) {
                $q->whereHas('proveedor', function ($pq) use ($empresaId) {
                    $pq->where('empresa_id', $empresaId);
                });
            })
            ->orderBy('fecha_vencimiento', 'asc')
            ->get();

        return response()->json($cuentas);
    }

    // Crea una nueva cuenta por pagar
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'proveedor_id' => 'required|exists:proveedores,id',
            'factura_numero' => 'required|string|max:255',
            'concepto' => 'nullable|string|max:255',
            'total' => 'required|numeric|min:0',
            'saldo_pendiente' => 'required|numeric|min:0',
            'fecha_emision' => 'required|date',
            'fecha_vencimiento' => 'required|date',
            'estado' => 'nullable|in:Pendiente,Parcial,Pagada,Vencida',
        ]);

        $cuenta = CuentaPorPagar::create([
            'proveedor_id' => $validatedData['proveedor_id'],
            'factura_numero' => $validatedData['factura_numero'],
            'concepto' => $validatedData['concepto'] ?? null,
            'total' => $validatedData['total'],
            'saldo_pendiente' => $validatedData['saldo_pendiente'],
            'fecha_emision' => $validatedData['fecha_emision'],
            'fecha_vencimiento' => $validatedData['fecha_vencimiento'],
            'estado' => $validatedData['estado'] ?? 'Pendiente',
        ]);

        return response()->json(['message' => 'Cuenta por pagar registrada', 'cuenta' => $cuenta], 201);
    }

    // Registra un abono: reduce el saldo pendiente y recalcula el estado
    public function registrarAbono(Request $request, $id)
    {
        $request->validate([
            'monto' => 'required|numeric|min:0.01',
        ]);

        $cuenta = CuentaPorPagar::findOrFail($id);
        $monto = (float) $request->monto;

        if ($monto > (float) $cuenta->saldo_pendiente) {
            return response()->json(['message' => 'El abono no puede superar el saldo pendiente.'], 422);
        }

        $cuenta->saldo_pendiente = round((float) $cuenta->saldo_pendiente - $monto, 2);

        if ((float) $cuenta->saldo_pendiente <= 0) {
            $cuenta->saldo_pendiente = 0;
            $cuenta->estado = 'Pagada';
        } else {
            $cuenta->estado = 'Parcial';
        }

        $cuenta->save();

        return response()->json(['message' => 'Abono registrado correctamente.', 'cuenta' => $cuenta]);
    }

    // Elimina una cuenta por pagar (uso administrativo)
    public function destroy($id)
    {
        $cuenta = CuentaPorPagar::findOrFail($id);
        $cuenta->delete();
        return response()->json(['message' => 'Cuenta por pagar eliminada.']);
    }
}