<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Lead;

class LeadController extends Controller
{
    // --- GESTIÓN DE LEADS ---
    public function index()
    {
        return response()->json(Lead::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'telefono' => 'required|string|max:255',
            'correo' => 'required|email|max:255',
            'horario_llamada' => 'required|string|max:255',
            'mensaje' => 'nullable|string'
        ]);

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

    public function update(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);
        
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

        $lead->save();

        return response()->json($lead);
    }

    public function destroy($id)
    {
        $lead = Lead::findOrFail($id);
        $lead->delete();

        return response()->json(['message' => 'Lead eliminado correctamente.']);
    }

    public function enviarMasivo(Request $request)
    {
        $validated = $request->validate([
            'asunto' => 'required|string',
            'mensaje' => 'required|string',
            'adjunto' => 'nullable|file|max:5120' // Máximo 5MB
        ]);

        $leads = Lead::whereNotNull('correo')->get();
        $cantidad = 0;

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
