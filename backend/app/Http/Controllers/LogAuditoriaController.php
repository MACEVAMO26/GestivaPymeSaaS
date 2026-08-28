<?php

namespace App\Http\Controllers;

use App\Models\LogAuditoria;
use Illuminate\Http\Request;

class LogAuditoriaController extends Controller
{
    // --- LOG DE AUDITORÍA ---
    // Obtiene los últimos 500 registros de auditoría ordenados por fecha
    public function index()
    {
        return LogAuditoria::with('usuario')
                           ->orderBy('fecha_hora', 'desc')
                           ->take(500)
                           ->get();
    }

    // Retorna los detalles de un registro específico de auditoría
    public function show($id)
    {
        return LogAuditoria::with('usuario')->findOrFail($id);
    }

    // Nota: Este controlador es de solo lectura por motivos de seguridad
}