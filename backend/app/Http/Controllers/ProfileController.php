<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

class ProfileController extends Controller
{
    // Bloque para actualizar los datos básicos de perfil del usuario
    public function update(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'nombres' => 'required|string|max:255',
            'email' => 'required|email|unique:usuarios,email,' . $user->id,
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->nombres = $request->nombres;
        $user->email = $request->email;
        $user->save();

        return response()->json([
            'message' => 'Perfil actualizado exitosamente',
            'user' => $user
        ]);
    }

    // Bloque para forzar el restablecimiento de contraseña del usuario
    public function forcePasswordReset(Request $request)
    {
        $user = $request->user();
        
        // Bloque de guardado en BD
        $user->debe_cambiar_clave = true;
        $user->save();

        // Bloque para invalidar tokens de acceso
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Cambio de clave forzado. Todos los dispositivos han sido desconectados.'
        ]);
    }

    // Bloque para actualizar la imagen de perfil del usuario
    public function uploadAvatar(Request $request)
    {
        $file = $request->file('avatar');
        \Log::info('Intento de subida de avatar', [
            'has_file' => $request->hasFile('avatar'), 
            'error' => $file ? $file->getError() : null,
            'ext' => $file ? $file->getClientOriginalExtension() : null,
            'mime' => $file ? $file->getMimeType() : null
        ]);

        $request->validate([
            'avatar' => 'required|file|max:5120',
        ]);

        $user = $request->user();

        if ($request->hasFile('avatar') && $file->isValid()) {
            // Bloque de reglas de validación
            $ext = strtolower($file->getClientOriginalExtension());
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                return response()->json(['message' => 'El archivo debe ser una imagen (JPG, PNG, GIF, WEBP).'], 422);
            }
            
            try {
                $uploaded = cloudinary()->uploadApi()->upload($request->file('avatar')->getRealPath(), [
                    'folder' => 'avatars'
                ]);
                $uploadedFileUrl = $uploaded['secure_url'];
                
                $user->avatar_url = $uploadedFileUrl;
                $user->save();

                return response()->json([
                    'message' => 'Avatar actualizado exitosamente',
                    'avatar_url' => $uploadedFileUrl
                ]);
            } catch (\Exception $e) {
                \Log::error('Error subiendo a Cloudinary: ' . $e->getMessage());
                return response()->json(['message' => 'Error al guardar la imagen en la nube.'], 500);
            }
        }

        return response()->json(['message' => 'No se subió ninguna imagen'], 400);
    }
}
