<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;

class UploadService
{
    /**
     * Sube un archivo a Cloudinary y retorna su URL segura HTTPS para guardar en Supabase.
     * Soporta imágenes (PNG/JPG/WEBP), PDFs, documentos de Word (.docx) y Excel (.xlsx).
     *
     * @param UploadedFile $file
     * @param string $folder Carpetas objetivo: 'avatars', 'logos', 'documentos', 'soportes', 'contratos'
     * @return string URL pública de Cloudinary
     */
    public static function uploadToCloudinary(UploadedFile $file, string $folder = 'documentos'): string
    {
        $mime = $file->getMimeType();
        $isRaw = !str_contains($mime, 'image/');

        $options = [
            'folder' => $folder,
        ];

        if ($isRaw) {
            $options['resource_type'] = 'raw';
        }

        $uploaded = cloudinary()->uploadApi()->upload($file->getRealPath(), $options);

        return $uploaded['secure_url'];
    }
}
