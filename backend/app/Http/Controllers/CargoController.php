<?php

namespace App\Http\Controllers;

use App\Models\Cargo;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CargoController extends Controller
{
    
    // --- GESTIÓN DE CARGOS ---
    // Obtiene la lista de todos los cargos asociados a la empresa del usuario
    public function index()
    {
        return Cargo::where('empresa_id', auth()->user()->empresa_id)->get();
    }

    
    // Registra un nuevo cargo en el sistema validando que el nombre no exista
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'funciones' => 'nullable|string',
            'rol_id' => 'required|integer|exists:roles,id',
            'area_id' => 'required|integer|exists:areas,id',
        ]);
        $data = array_merge($validatedData, [
            'empresa_id' => auth()->user()->empresa_id,
            'activo' => true,
        ]);
        $cargo = Cargo::create($data);

        return response()->json($cargo, 201);
    }

    
    // Retorna los detalles de un cargo específico
    public function show($id)
    {
        return Cargo::findOrFail($id);
    }

    
    // Actualiza los datos de un cargo existente ignorando la validación de nombre propio
    public function update(Request $request, $id)
    {
        $cargo = Cargo::findOrFail($id);
        $validatedData = $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'descripcion' => 'nullable|string',
            'funciones' => 'nullable|string',
            'rol_id' => 'required|integer|exists:roles,id',
            'area_id' => 'required|integer|exists:areas,id',
        ]);
        $cargo->update($validatedData);

        return response()->json($cargo, 200);
    }

    // Alterna el estado activo/inactivo del cargo y registra la fecha de inactivación si aplica
    public function changeStatus($id)
    {
        $cargo = Cargo::findOrFail($id);

        // LEY: El cargo "Gerente General" es el primer cargo creado y no se puede inactivar.
        if ($cargo->nombre === 'Gerente General') {
            return response()->json([
                'error' => 'El cargo Gerente General no puede ser inactivado.'
            ], 422);
        }

        $cargo->activo = !$cargo->activo;
        
        if (!$cargo->activo) {
            $cargo->inactive_at = now();
        } else {
            $cargo->inactive_at = null;
        }

        $cargo->save();

        $message = $cargo->activo ? 'Cargo activado correctamente.' : 'Cargo inactivado correctamente.';
        return response()->json(['mensaje' => $message], 200);
    }
}