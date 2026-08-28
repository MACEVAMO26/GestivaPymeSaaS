<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\VentasExport;
use App\Exports\EmpleadosExport;
use App\Exports\ProductosExport;
use App\Exports\ProveedoresExportSheet;
use Illuminate\Support\Facades\Auth;

class ExportController extends Controller
{
    public function exportVentas(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->empresa_id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return Excel::download(new VentasExport($user->empresa_id), 'ventas_' . date('Y-m-d') . '.xlsx');
    }

    public function exportEmpleados(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->empresa_id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return Excel::download(new EmpleadosExport($user->empresa_id), 'empleados_' . date('Y-m-d') . '.xlsx');
    }

    public function exportProductos(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->empresa_id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return Excel::download(new ProductosExport($user->empresa_id), 'inventario_' . date('Y-m-d') . '.xlsx');
    }

    public function exportProveedores(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->empresa_id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return Excel::download(new ProveedoresExportSheet($user->empresa_id, false), 'proveedores_' . date('Y-m-d') . '.xlsx');
    }
}
