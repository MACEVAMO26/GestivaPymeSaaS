<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\DocumentoEmpleado;
use App\Models\Empleado;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;

class DocumentoEmpleadoController extends Controller
{
    public function getDocumentos($empleadoId)
    {
        $documentos = DocumentoEmpleado::where('empleado_id', $empleadoId)->orderBy('created_at', 'desc')->get();
        return response()->json($documentos);
    }

    public function misDocumentos(Request $request)
    {
        // Obtener el empleado del usuario autenticado
        $empleado = Empleado::where('usuario_id', $request->user()->id)->first();
        if (!$empleado) {
            return response()->json([], 200); // Si no es empleado, no tiene documentos
        }

        $documentos = DocumentoEmpleado::where('empleado_id', $empleado->id)->orderBy('created_at', 'desc')->get();
        return response()->json($documentos);
    }

    public function store(Request $request, $empleadoId)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'categoria' => 'nullable|string|max:255',
            'archivo' => 'required|file|max:10240' // Max 10MB
        ]);

        $empleado = Empleado::findOrFail($empleadoId);

        $file = $request->file('archivo');
        $extension = $file->getClientOriginalExtension();
        
        // Determinar tipo
        $tipo = 'otro';
        if (in_array(strtolower($extension), ['pdf'])) $tipo = 'pdf';
        if (in_array(strtolower($extension), ['doc', 'docx'])) $tipo = 'word';
        if (in_array(strtolower($extension), ['xls', 'xlsx'])) $tipo = 'excel';
        if (in_array(strtolower($extension), ['ppt', 'pptx'])) $tipo = 'powerpoint';

        try {
            // Subir a Cloudinary como archivo crudo (raw) para PDFs, Word, Excel, PPT
            $uploadedFileUrl = cloudinary()->upload($file->getRealPath(), [
                'folder' => 'gestivapyme/documentos_empleados',
                'resource_type' => 'raw'
            ]);

            $documento = DocumentoEmpleado::create([
                'empleado_id' => $empleado->id,
                'nombre' => $request->nombre,
                'categoria' => $request->categoria ?: 'Otros',
                'tipo_archivo' => $tipo,
                'cloudinary_url' => $uploadedFileUrl->getSecurePath(),
                'cloudinary_public_id' => $uploadedFileUrl->getPublicId(),
            ]);

            return response()->json(['message' => 'Documento subido con éxito', 'documento' => $documento], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al subir documento: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $documento = DocumentoEmpleado::findOrFail($id);

        try {
            if ($documento->cloudinary_public_id) {
                cloudinary()->destroy($documento->cloudinary_public_id, ['resource_type' => 'raw']);
            }
            $documento->delete();
            return response()->json(['message' => 'Documento eliminado con éxito']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al eliminar documento: ' . $e->getMessage()], 500);
        }
    }
}
