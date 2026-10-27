<?php

namespace App\Http\Controllers;

use App\Models\LogAuditoria;
use Illuminate\Http\Request;

class LogAuditoriaController extends Controller
{
    // Bloque para obtener los últimos 500 registros de auditoría ordenados por fecha
    public function index()
    {
        return LogAuditoria::with('usuario')
                           ->orderBy('fecha_hora', 'desc')
                           ->take(500)
                           ->get();
    }

    // Bloque para retornar los detalles de un registro específico de auditoría
    public function show($id)
    {
        return LogAuditoria::with('usuario')->findOrFail($id);
    }

    // Bloque de nota informativa de seguridad: controlador de solo lectura
}