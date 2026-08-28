<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\SoporteTicket;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use App\Mail\TicketSoporteMail;

class SoporteTicketController extends Controller
{
    // Obtener tickets de la empresa actual (Dashboard Empresa)
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $tickets = SoporteTicket::with(['usuario', 'tecnico'])
            ->where('empresa_id', $user->empresa_id)
            ->where('activo', true)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tickets);
    }

    // Crear un nuevo ticket desde la empresa
    public function store(Request $request)
    {
        $request->validate([
            'asunto' => 'required|string|max:255',
            'mensaje' => 'required|string',
        ]);

        $user = Auth::user();

        $ticket = SoporteTicket::create([
            'empresa_id' => $user->empresa_id,
            'usuario_id' => $user->id,
            'asunto' => $request->asunto,
            'mensaje' => $request->mensaje,
            'estado' => 'Abierto',
            'activo' => true
        ]);

        // Enviar correo de notificación al SaaS Admin (o a un correo genérico de soporte)
        try {
            // Asumiendo que el SaaS Admin recibe estos correos en un email configurado
            // O podríamos buscar a los usuarios del sistema maestro
            Mail::to('soporte@gestivapyme.com')->send(new TicketSoporteMail($ticket, 'Nuevo Ticket Creado'));
        } catch (\Exception $e) {
            // Log the error but don't fail the request
            \Log::error('No se pudo enviar correo de soporte: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Ticket creado con éxito',
            'ticket' => $ticket
        ], 201);
    }

    // Funciones exclusivas para el SaaS Admin
    // ----------------------------------------
    
    // Listar todos los tickets agrupados por cliente
    public function saasIndex()
    {
        $tickets = SoporteTicket::with(['empresa', 'usuario', 'tecnico'])
            ->where('activo', true)
            ->orderBy('estado', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tickets);
    }

    // Actualizar ticket (Asignar, cambiar estado, notas)
    public function update(Request $request, $id)
    {
        $request->validate([
            'estado' => 'sometimes|in:Abierto,En progreso,Resuelto,Cerrado',
            'notas_resolucion' => 'nullable|string',
            'tecnico_id' => 'nullable|exists:usuarios,id'
        ]);

        $ticket = SoporteTicket::findOrFail($id);
        
        if ($request->has('estado')) $ticket->estado = $request->estado;
        if ($request->has('notas_resolucion')) $ticket->notas_resolucion = $request->notas_resolucion;
        if ($request->has('tecnico_id')) $ticket->tecnico_id = $request->tecnico_id;
        
        $ticket->save();

        // Si se resolvió o cerró, notificar al usuario
        if (in_array($request->estado, ['Resuelto', 'Cerrado'])) {
            try {
                $usuario = $ticket->usuario;
                if ($usuario && $usuario->email) {
                    Mail::to($usuario->email)->send(new TicketSoporteMail($ticket, 'Actualización de tu Ticket de Soporte'));
                }
            } catch (\Exception $e) {
                \Log::error('No se pudo enviar correo de actualización: ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Ticket actualizado con éxito',
            'ticket' => $ticket->load(['empresa', 'usuario', 'tecnico'])
        ]);
    }
}
