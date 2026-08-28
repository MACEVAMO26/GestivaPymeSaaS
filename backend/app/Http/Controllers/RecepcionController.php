<?php

namespace App\Http\Controllers;

use App\Models\Recepcion;
use App\Models\RecepcionDetalle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // Permite manejar transacciones en la base de datos

class RecepcionController extends Controller
{
    // Devuelve todas las recepciones con su informacion relacionada
    public function index()
    {
        return Recepcion::with(['usuario', 'ordenCompra', 'detalles.producto'])->get();
    }

    // Registra una nueva recepcion atada a una orden de compra
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'orden_compra_id' => 'required|integer|exists:ordenes_compra,id',
            'usuario_id' => 'required|integer|exists:usuarios,id',
            'fecha_recepcion' => 'required|date',
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|integer|exists:productos,id',
            'detalles.*.cantidad_recibida' => 'required|integer|min:1',
            'detalles.*.estado_calidad' => 'required|in:Bueno,Malo,Regular',
        ]);
        DB::beginTransaction();

        try {
            $recepcion = Recepcion::create([
                'orden_compra_id' => $validatedData['orden_compra_id'],
                'usuario_id' => $validatedData['usuario_id'],
                'fecha_recepcion' => $validatedData['fecha_recepcion'],
                'observaciones' => $validatedData['observaciones'] ?? null,
            ]);
            foreach ($validatedData['detalles'] as $detalle) {
                RecepcionDetalle::create([
                    'recepcion_id' => $recepcion->id,
                    'producto_id' => $detalle['producto_id'],
                    'cantidad_recibida' => $detalle['cantidad_recibida'],
                    'estado_calidad' => $detalle['estado_calidad'],
                ]);
            }
            DB::commit();
            return response()->json($recepcion->load('detalles'), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al guardar la recepción: ' . $e->getMessage()], 500);
        }
    }

    // Muestra los detalles de una recepcion en particular
    public function show($id)
    {
        return Recepcion::with(['usuario', 'ordenCompra', 'detalles.producto'])->findOrFail($id);
    }
}