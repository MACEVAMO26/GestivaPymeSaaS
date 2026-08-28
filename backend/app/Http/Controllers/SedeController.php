<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SedeController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $sedes = \App\Models\Sede::where('empresa_id', $user->empresa_id)->get();
        return response()->json($sedes);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        
        $request->validate([
            'nombre' => 'required|string|max:255',
            'direccion' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:50',
            'estado' => 'nullable|in:activa,inactiva'
        ]);

        // Verificar duplicados en la misma empresa
        $existe = \App\Models\Sede::where('empresa_id', $user->empresa_id)
                                  ->where('nombre', $request->nombre)
                                  ->exists();

        if ($existe) {
            return response()->json(['message' => 'Ya existe una sede con ese nombre en la empresa.'], 400);
        }

        $sede = \App\Models\Sede::create([
            'empresa_id' => $user->empresa_id,
            'nombre' => $request->nombre,
            'direccion' => $request->direccion,
            'telefono' => $request->telefono,
            'estado' => $request->estado ?? 'activa'
        ]);

        \App\Models\LogAuditoria::create([
            'usuario_id' => $user->id,
            'modulo' => 'sedes',
            'accion' => 'Crear Sede',
            'entidad_afectada_id' => $sede->id,
            'descripcion' => 'Sede creada: ' . $sede->nombre
        ]);

        return response()->json(['message' => 'Sede creada con éxito', 'sede' => $sede], 201);
    }

    public function update(Request $request, $id)
    {
        $user = auth()->user();
        $sede = \App\Models\Sede::where('empresa_id', $user->empresa_id)->findOrFail($id);

        $request->validate([
            'nombre' => 'required|string|max:255',
            'direccion' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:50',
            'estado' => 'in:activa,inactiva'
        ]);

        // Verificar duplicado si cambia el nombre
        if ($request->nombre !== $sede->nombre) {
            $existe = \App\Models\Sede::where('empresa_id', $user->empresa_id)
                                      ->where('nombre', $request->nombre)
                                      ->exists();
            if ($existe) {
                return response()->json(['message' => 'Ya existe una sede con ese nombre en la empresa.'], 400);
            }
        }

        $sede->update($request->only(['nombre', 'direccion', 'telefono', 'estado']));

        \App\Models\LogAuditoria::create([
            'usuario_id' => $user->id,
            'modulo' => 'sedes',
            'accion' => 'Actualizar Sede',
            'entidad_afectada_id' => $sede->id,
            'descripcion' => 'Sede actualizada: ' . $sede->nombre
        ]);

        return response()->json(['message' => 'Sede actualizada con éxito', 'sede' => $sede]);
    }

    public function destroy($id)
    {
        $user = auth()->user();
        $sede = \App\Models\Sede::where('empresa_id', $user->empresa_id)->findOrFail($id);
        
        $sede->delete();

        \App\Models\LogAuditoria::create([
            'usuario_id' => $user->id,
            'modulo' => 'sedes',
            'accion' => 'Eliminar Sede',
            'entidad_afectada_id' => $sede->id,
            'descripcion' => 'Sede eliminada: ' . $sede->nombre
        ]);

        return response()->json(['message' => 'Sede eliminada con éxito']);
    }
}
