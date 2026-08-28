<?php

namespace App\Http\Controllers;

use App\Models\Tarifa;
use Illuminate\Http\Request;

class TarifaController extends Controller
{
    public function index()
    {
        $tarifa = Tarifa::first();
        if (!$tarifa) {
            $tarifa = Tarifa::create(['plan_mensual' => 70000, 'modulo_extra' => 20000, 'addon_extra' => 10000]);
        }
        return response()->json($tarifa);
    }

    public function update(Request $request, $id)
    {
        $tarifa = Tarifa::findOrFail($id);
        $tarifa->update($request->only(['plan_mensual', 'modulo_extra', 'addon_extra']));
        return response()->json(['message' => 'Tarifas actualizadas', 'tarifa' => $tarifa]);
    }

    public function catalogo()
    {
        $catalogo = \App\Models\TarifaCatalogo::where('activo', true)->get();
        return response()->json($catalogo);
    }

    public function catalogoUpdate(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|string|exists:tarifas_catalogo,id',
            'items.*.valor' => 'required|numeric|min:0',
        ]);

        foreach ($request->items as $item) {
            \App\Models\TarifaCatalogo::where('id', $item['id'])->update(['valor' => $item['valor']]);
        }

        $catalogo = \App\Models\TarifaCatalogo::where('activo', true)->get();
        return response()->json(['message' => 'Catálogo de tarifas actualizado', 'catalogo' => $catalogo]);
    }
}
