<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\SoporteTicket;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use App\Mail\TicketSoporteMail;

class SoporteTicketController extends Controller
{
    // Bloque para obtener los tickets de soporte de la empresa actual
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $tickets = SoporteTicket::with(['usuario', 'tecnico'])
            ->where('empresa_id', $user->empresa_id)
            ->where(function ($q) {
                $q->whereNull('activo')
                  ->orWhereIn('activo', ['1', 'true', 'activo']);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tickets);
    }

    // Bloque para crear un nuevo ticket de soporte desde la empresa
    public function store(Request $request)
    {
        $request->validate([
            'asunto' => 'required|string|max:255',
            'mensaje' => 'required|string',
            'tipo' => 'nullable|string|max:100',
            'prioridad' => 'nullable|in:Alta,Media,Baja',
        ]);

        $user = Auth::user();

        $ticket = SoporteTicket::create([
            'empresa_id' => $user->empresa_id,
            'usuario_id' => $user->id,
            'asunto' => $request->asunto,
            'tipo' => $request->tipo ?? 'Técnico',
            'prioridad' => $request->prioridad ?? 'Media',
            'mensaje' => $request->mensaje,
            'estado' => 'Abierto',
            'activo' => '1'
        ]);

        // Bloque para notificar al administrador de soporte por correo
        try {
            Mail::to('soporte@gestivapyme.com')->send(new TicketSoporteMail($ticket, 'Nuevo Ticket Creado'));
        } catch (\Exception $e) {
            \Log::error('No se pudo enviar correo de soporte: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Ticket creado con éxito',
            'ticket' => $ticket
        ], 201);
    }

    // Bloque de métodos administrativos para el SaaS Admin
    
    // Bloque para listar todos los tickets de clientes en el SaaS
    public function saasIndex()
    {
        $tickets = SoporteTicket::with(['empresa', 'usuario', 'tecnico'])
            ->where(function ($q) {
                $q->whereNull('activo')
                  ->orWhereIn('activo', ['1', 'true', 'activo']);
            })
            ->orderBy('estado', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tickets);
    }

    // Bloque para actualizar el ticket de soporte (asignar técnico, cambiar estado y notas)
    public function update(Request $request, $id)
    {
        $request->validate([
            'estado' => 'sometimes|in:Abierto,En progreso,Resuelto,Cerrado',
            'notas_resolucion' => 'nullable|string',
            'tecnico_id' => 'nullable|exists:usuarios,id',
            'prioridad' => 'nullable|in:Alta,Media,Baja',
            'tipo' => 'nullable|string|max:100'
        ]);

        $ticket = SoporteTicket::findOrFail($id);
        
        if ($request->has('estado')) $ticket->estado = $request->estado;
        if ($request->has('notas_resolucion')) $ticket->notas_resolucion = $request->notas_resolucion;
        if ($request->has('tecnico_id')) $ticket->tecnico_id = $request->tecnico_id;
        if ($request->has('prioridad')) $ticket->prioridad = $request->prioridad;
        if ($request->has('tipo')) $ticket->tipo = $request->tipo;
        
        $ticket->save();

        // Bloque para notificar al usuario sobre la resolución del ticket
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
