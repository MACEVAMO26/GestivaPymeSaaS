<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Empleado;
use App\Models\Producto;
use App\Models\Cliente;
use App\Models\Venta;

class GestivaTutorialController extends Controller
{
    public function getStatus(Request $request)
    {
        // El usuario logueado
        $user = $request->user();

        // Para simplificar, contamos los registros globales si son módulos simples
        // Si tienes multi-tenant con empresa_id, idealmente filtras por la empresa del usuario.
        // Pero asumiendo que el User tiene acceso a ciertos datos o es el admin:
        
        // Empleados (excluyendo bajas si se desea, o todos)
        $empleadosCount = Empleado::count();
        
        // Productos
        $productosCount = Producto::count();

        // Clientes
        $clientesCount = Cliente::count();

        // Ventas
        $ventasCount = Venta::count();

        return response()->json([
            'empleados' => $empleadosCount,
            'productos' => $productosCount,
            'clientes' => $clientesCount,
            'ventas' => $ventasCount,
            'inventario' => $productosCount // Alias
        ]);
    }
}
