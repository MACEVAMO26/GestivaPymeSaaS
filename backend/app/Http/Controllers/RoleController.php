<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    // Trae los roles que pertenecen a la empresa actual
    public function index()
    {
        return Role::where('empresa_id', auth()->user()->empresa_id)->get();
    }

    // Registra un nuevo rol en la empresa del usuario
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'nombre' => 'required|string|max:255|unique:roles',
            'descripcion' => 'nullable|string',
        ]);
        $data = array_merge($validatedData, [
            'empresa_id' => auth()->user()->empresa_id,
            'activo' => true,
        ]);
        $role = Role::create($data);

        return response()->json($role, 201);
    }

    // Trae la informacion de un rol especifico
    public function show($id)
    {
        return Role::findOrFail($id);
    }

    // Modifica los datos de un rol
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);
        
        $rules = [
            'descripcion' => 'nullable|string',
        ];

        // Solo permitir cambiar el nombre si NO es un rol base
        if (!$role->es_base) {
            $rules['nombre'] = ['required', 'string', 'max:255', Rule::unique('roles')->ignore($role->id)];
        }

        $validatedData = $request->validate($rules);
        $role->update($validatedData);

        return response()->json($role);
    }

    // Cambia el estado activo o inactivo del rol
    public function changeStatus($id)
    {
        $role = Role::findOrFail($id);
        
        if ($role->es_base) {
            return response()->json(['error' => 'No se puede inactivar un rol base del sistema.'], 403);
        }

        $role->activo = !$role->activo;
        $role->inactive_at = $role->activo ? null : now();

        $role->save();

        $message = $role->activo ? 'Rol activado correctamente.' : 'Rol inactivado correctamente.';
        return response()->json(['mensaje' => $message]);
    }
}