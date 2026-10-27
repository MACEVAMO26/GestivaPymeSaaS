<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Lead;

class LeadController extends Controller
{
    // Bloque para listar todos los prospectos registrados ordenados por fecha
    public function index()
    {
        return response()->json(Lead::orderBy('created_at', 'desc')->get());
    }

    // Bloque para registrar un nuevo prospecto proveniente del landing page o chatbot
    public function store(Request $request)
    {
        // Bloque de reglas de validación de datos del prospecto
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'telefono' => 'required|string|max:255',
            'correo' => 'required|email|max:255',
            'horario_llamada' => 'required|string|max:255',
            'mensaje' => 'nullable|string'
        ]);

        // Bloque de guardado del nuevo prospecto en la base de datos con estado pendiente
        $lead = Lead::create([
            'nombre' => $validated['nombre'],
            'telefono' => $validated['telefono'],
            'correo' => $validated['correo'],
            'horario_llamada' => $validated['horario_llamada'] ?? null,
            'mensaje' => $validated['mensaje'] ?? null,
            'estado' => 'pendiente'
        ]);

        return response()->json($lead, 201);
    }

    // Bloque para actualizar el estado o notas de seguimiento de un prospecto
    public function update(Request $request, $id)
    {
        // Bloque de búsqueda del prospecto por ID
        $lead = Lead::findOrFail($id);
        
        // Bloque de validación de campos modificables
        $validated = $request->validate([
            'estado' => 'sometimes|in:pendiente,contactado,archivado,eliminado',
            'notas' => 'sometimes|array'
        ]);

        if (isset($validated['estado'])) {
            $lead->estado = $validated['estado'];
        }
        
        if (isset($validated['notas'])) {
            $lead->notas = $validated['notas'];
        }

        // Bloque de persistencia de cambios en la base de datos
        $lead->save();

        return response()->json($lead);
    }

    // Bloque para eliminar un prospecto del sistema
    public function destroy($id)
    {
        $lead = Lead::findOrFail($id);
        $lead->delete();

        return response()->json(['message' => 'Lead eliminado correctamente.']);
    }

    // Bloque para procesar el envío masivo de correos comerciales a prospectos
    public function enviarMasivo(Request $request)
    {
        // Bloque de validación de parámetros de la campaña y archivo adjunto
        $validated = $request->validate([
            'asunto' => 'required|string',
            'mensaje' => 'required|string',
            'adjunto' => 'nullable|file|max:5120'
        ]);

        // Bloque de consulta de prospectos con correo electrónico registrado
        $leads = Lead::whereNotNull('correo')->get();
        $cantidad = 0;

        // Bloque de iteración y despacho individual de correos con adjunto opcional
        foreach ($leads as $lead) {
            try {
                \Illuminate\Support\Facades\Mail::html(nl2br(e($validated['mensaje'])), function ($message) use ($lead, $validated, $request) {
                    $message->to($lead->correo)
                            ->subject($validated['asunto']);
                            
                    if ($request->hasFile('adjunto')) {
                        $file = $request->file('adjunto');
                        $message->attach($file->getRealPath(), [
                            'as' => $file->getClientOriginalName(),
                            'mime' => $file->getMimeType(),
                        ]);
                    }
                });
                $cantidad++;
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Error enviando correo a ' . $lead->correo . ': ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Campaña procesada.',
            'cantidad_enviados' => $cantidad
        ]);
    }
}
