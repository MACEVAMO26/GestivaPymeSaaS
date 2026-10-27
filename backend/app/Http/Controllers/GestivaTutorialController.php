<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Empleado;
use App\Models\Producto;
use App\Models\Cliente;
use App\Models\Venta;

class GestivaTutorialController extends Controller
{
    // Bloque para consultar el estado y conteos globales para el tutorial interactivo
    public function getStatus(Request $request)
    {
        
        $user = $request->user();

        
        
        // Bloque para contar empleados registrados
        $empleadosCount = Empleado::count();
        
        // Bloque para contar catálogo de productos
        $productosCount = Producto::count();

        // Bloque para contar clientes registrados
        $clientesCount = Cliente::count();

        // Bloque para contar histórico de ventas
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
