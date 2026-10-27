<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    // Bloque para marcar que el usuario autenticado completó el tutorial de IA
    public function marcarTutorialVisto(Request $request)
    {
        $user = Auth::user();
        if ($user) {
            $user->tutorial_ia_visto = true;
            $user->save();
            return response()->json(['message' => 'Tutorial marcado como visto']);
        }
        return response()->json(['message' => 'No autorizado'], 401);
    }

    // Bloque para alternar el estado activo o inactivo de un usuario
    public function toggleActivo($id)
    {
        $user = User::findOrFail($id);
        $user->update(['activo' => !$user->activo]);

        return response()->json(['message' => 'Estado del usuario actualizado exitosamente', 'activo' => $user->activo]);
    }

    // Bloque para regenerar y reenviar credenciales de acceso por correo electrónico
    public function reenviarCredenciales($id)
    {
        $user = User::findOrFail($id);
        $empresa = \App\Models\Empresa::find(auth()->user()->empresa_id);
        
        // Bloque para generar contraseña temporal
        $tempPassword = $user->documento;
        $user->update([
            'password_hash' => \Illuminate\Support\Facades\Hash::make($tempPassword),
            'debe_cambiar_clave' => true
        ]);

        try {
            \Mail::to($user->email_personal)->send(new \App\Mail\CredencialesUsuarioMail($user, $tempPassword, $empresa->razon_social));
            
            // Bloque para enmascarar dirección de correo
            $email = $user->email_personal;
            $parts = explode('@', $email);
            if (count($parts) == 2) {
                $maskedEmail = substr($parts[0], 0, 2) . str_repeat('*', max(1, strlen($parts[0]) - 2)) . '@' . $parts[1];
            } else {
                $maskedEmail = $email;
            }

            return response()->json([
                'message' => 'Credenciales reenviadas con éxito al correo ' . $maskedEmail,
                'enmascarado' => $maskedEmail
            ]);
        } catch (\Exception $e) {
            \Log::error("Error reenviando correo a {$user->email_personal}: " . $e->getMessage());
            return response()->json(['error' => 'No se pudo enviar el correo de credenciales. Verifique la conexión SMTP.'], 500);
        }
    }

    // Bloque para listar los usuarios de la empresa (o todas si es SaaS Admin)
    public function index(Request $request)
    {
        $user = auth()->user();
        $rol = $user->rol;

        // Bloque para listar usuarios en modo administrador SaaS
        if ($rol && in_array($rol->nombre, ['SAAS Admin', 'SaaS Admin', 'Super Administrador']) && $request->has('empresa_id')) {
            return User::with(['cargo', 'rol', 'empleado.area', 'empleado.cargo', 'empleado.cargo.rol'])
                ->where('empresa_id', $request->empresa_id)
                ->get();
        }

        // Bloque para listar usuarios de la empresa actual
        return User::with(['cargo', 'rol', 'empleado.area', 'empleado.cargo', 'empleado.cargo.rol'])
            ->where('empresa_id', $user->empresa_id)
            ->get();
    }

    // Bloque para registrar un nuevo usuario y formalizar automáticamente al Jefe de RRHH si aplica
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'primer_nombre' => 'required|string|max:255',
            'segundo_nombre' => 'nullable|string|max:255',
            'primer_apellido' => 'required|string|max:255',
            'segundo_apellido' => 'nullable|string|max:255',
            'tipo_documento' => 'required|string|max:50',
            'documento' => 'required|string|max:255|unique:usuarios',
            'email_personal' => 'required|string|email|max:255',
            'telefono' => 'nullable|string|max:255',
            'direccion' => 'nullable|string|max:255',
        ]);

        // Bloque para sanear nombres y generar formato de correo institucional
        $cleanString = function($string) {
            if (empty($string)) return "";
            $string = strtolower(trim($string));
            $string = str_replace(["á","é","í","ó","ú","ñ"," "], ["a","e","i","o","u","n",""], $string);
            return preg_replace("/[^a-z0-9]/", "", $string);
        };

        $n1 = $cleanString($validatedData["primer_nombre"]);
        $n2 = $cleanString($validatedData["segundo_nombre"] ?? "");
        $p1 = $cleanString($validatedData["primer_apellido"]);
        $p2 = $cleanString($validatedData["segundo_apellido"] ?? "");

        // Bloque de regla para generación de identificador de correo institucional
        $prefixBase = substr($n1, 0, 2) . substr($n2, 0, 1) . substr($p1, 0, 2) . substr($p2, 0, 3);
        
        $empresa = \App\Models\Empresa::find(auth()->user()->empresa_id);
        $dominioEmpresa = $empresa->dominio ? $empresa->dominio : \Str::slug($empresa->razon_social, "");
        $domain = "@" . $dominioEmpresa . ".gestivapyme.com";
        
        $finalEmail = $prefixBase . $domain;
        
        if (\App\Models\User::where("email", $finalEmail)->exists()) {
            // Bloque de regla invertida en caso de colisión de nombre de usuario
            $prefixInvertido = substr($p1, 0, 2) . substr($p2, 0, 1) . substr($n1, 0, 2) . substr($n2, 0, 3);
            $finalEmail = $prefixInvertido . $domain;
            
            // Bloque de contingencia con documento en caso de colisión persistente
            if (\App\Models\User::where("email", $finalEmail)->exists()) {
                $finalEmail = $validatedData["documento"] . $domain;
            }
        }

        // Bloque para asignar documento como contraseña inicial
        $tempPassword = $validatedData["documento"];

        // Bloque de transacción para creación del usuario en BD
        $user = DB::transaction(function () use ($validatedData, $finalEmail, $tempPassword) {
            
            $user = User::create([
                'primer_nombre' => $validatedData['primer_nombre'],
                'segundo_nombre' => $validatedData['segundo_nombre'] ?? null,
                'primer_apellido' => $validatedData['primer_apellido'],
                'segundo_apellido' => $validatedData['segundo_apellido'] ?? null,
                'tipo_documento' => $validatedData['tipo_documento'],
                'documento' => $validatedData['documento'],
                'email' => $finalEmail,
                'email_personal' => $validatedData['email_personal'],
                'telefono' => $validatedData['telefono'] ?? null,
                'direccion' => $validatedData['direccion'] ?? null,
                'password_hash' => Hash::make($tempPassword),
                'debe_cambiar_clave' => true,
                'perfil_formalizado' => false,
                'empresa_id' => auth()->user()->empresa_id,
            ]);

            // Bloque de formalización automática para el primer Jefe de RRHH
            $roleJefe = \App\Models\Role::firstOrCreate(
                ['empresa_id' => auth()->user()->empresa_id, 'nombre' => 'Jefe de Area'],
                ['descripcion' => 'Responsable de su area y formalizacion', 'activo' => true]
            );

            $jefeRRHHActivo = User::where('empresa_id', auth()->user()->empresa_id)
                ->where('rol_id', $roleJefe->id)
                ->where('activo', true)
                ->exists();

            if (!$jefeRRHHActivo) {
                // Bloque para localizar o inicializar el área de RRHH
                $areaRRHH = \App\Models\Area::firstOrCreate(
                    ['empresa_id' => auth()->user()->empresa_id, 'nombre' => 'Recursos Humanos'],
                    ['descripcion' => 'Area encargada de la gestion del talento humano', 'activo' => true]
                );
                
                $cargoRRHH = \App\Models\Cargo::firstOrCreate(
                    ['empresa_id' => auth()->user()->empresa_id, 'nombre' => 'Jefe de Recursos Humanos'],
                    ['rol_id' => $roleJefe->id, 'area_id' => $areaRRHH->id, 'descripcion' => 'Responsable de la gestion humana de la empresa', 'activo' => true]
                );

                // Bloque para asignar el rol correspondiente en BD
                $user->rol_id = $roleJefe->id;
                $user->perfil_formalizado = true; // Entra ya formalizado
                $user->save();

                // Bloque para garantizar accesos a módulos de RRHH
                $modulosRRHH = ['rrhh', 'd_for', 'r_tur', 'r_aus', 'r_vac'];
                foreach ($modulosRRHH as $modRRHH) {
                    \App\Models\Permiso::firstOrCreate([
                        'rol_id' => $roleJefe->id,
                        'modulo_id' => $modRRHH
                    ], [
                        'puede_ver' => 1,
                        'puede_crear' => 1,
                        'puede_editar' => 1,
                        'puede_inactivar' => 1,
                        'puede_descargar' => 1,
                        'puede_subir' => 1
                    ]);
                }

                // Bloque para formalizar registro de empleado en BD
                \App\Models\Empleado::create([
                    'usuario_id' => $user->id,
                    'empresa_id' => $user->empresa_id,
                    'area_id' => $areaRRHH->id,
                    'cargo_id' => $cargoRRHH->id,
                    'codigo_empleado' => 'EMP-' . $user->empresa_id . '-001',
                    'fecha_contratacion' => now(),
                    'estado' => 'activo'
                ]);
            }
            
            return $user;
        });

        // Bloque para enviar credenciales de acceso por correo
        try {
            $empresa = \App\Models\Empresa::find(auth()->user()->empresa_id);
            \Mail::to($user->email_personal)->send(new \App\Mail\CredencialesUsuarioMail($user, $tempPassword, $empresa->razon_social));
        } catch (\Exception $e) {
            \Log::error("Error enviando correo a {$user->email_personal}: " . $e->getMessage());
        }

        $email = $user->email_personal;
        $parts = explode('@', $email);
        $maskedEmail = count($parts) == 2 ? substr($parts[0], 0, 2) . str_repeat('*', max(1, strlen($parts[0]) - 2)) . '@' . $parts[1] : $email;

        return response()->json([
            'user' => $user,
            'temp_password' => $tempPassword, // Se devuelve para mostrar en pantalla al gerente mientras se configuran correos
            'enmascarado' => $maskedEmail,
            'message' => 'Usuario creado exitosamente. Se ha enviado correo a ' . $maskedEmail
        ], 201);
    }

    // Bloque para traer la información de un usuario específico
    public function show($id)
    {
        return User::findOrFail($id);
    }

    // Bloque para actualizar la información de un usuario
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validatedData = $request->validate([
            'primer_nombre' => 'required|string|max:255',
            'segundo_nombre' => 'nullable|string|max:255',
            'primer_apellido' => 'required|string|max:255',
            'segundo_apellido' => 'nullable|string|max:255',
            'tipo_documento' => 'required|string|max:50',
            'documento' => ['required', 'string', 'max:255', Rule::unique('usuarios')->ignore($user->id)],
            'email_personal' => 'nullable|string|email|max:255',
            'telefono' => 'nullable|string|max:255',
            'direccion' => 'nullable|string|max:255',
        ]);

        $user->update($validatedData);
        
        return response()->json([
            'message' => 'Usuario actualizado correctamente',
            'user' => $user
        ]);
    }

    
    // Bloque para eliminar un usuario respetando las restricciones legales
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $rolUsuario = $user->rol;

        if ($rolUsuario && in_array($rolUsuario->nombre, ['Gerente General', 'Gerente'])) {
            return response()->json(['error' => 'El Gerente General no puede ser eliminado.'], 422);
        }

        if ($user->empleado) {
            $user->empleado->delete();
        }

        $user->delete();

        return response()->json(['message' => 'Usuario eliminado correctamente']);
    }

    
    // Bloque para cambiar el estado activo o inactivo de un usuario
    public function changeStatus($id)
    {
        $user = User::findOrFail($id);
        $empresaId = auth()->user()->empresa_id;

        $rolUsuario = $user->rol;
        $rolSolicitante = auth()->user()->rol;

        // Bloque de validación de restricciones legales para Gerente General
        if ($rolUsuario && $rolUsuario->nombre === 'Gerente General') {
            return response()->json([
                'error' => 'El Gerente General no puede ser inactivado. Solo el SAAS admin puede cambiar sus datos.'
            ], 422);
        }

        // Bloque de validación de restricciones legales para Jefe de RRHH
        $esJefeRRHH = $rolUsuario && $rolUsuario->nombre === 'Jefe de Área';
        if ($esJefeRRHH) {
            $esGerente = $rolSolicitante && $rolSolicitante->nombre === 'Gerente General';
            if (!$esGerente) {
                return response()->json([
                    'error' => 'Solo el Gerente General puede inactivar al Jefe de Recursos Humanos.'
                ], 403);
            }
        }

        $user->activo = !$user->activo;
        $user->inactive_at = $user->activo ? null : now();

        $user->save();

        $message = $user->activo ? 'Usuario activado correctamente.' : 'Usuario inactivado correctamente.';
        return response()->json(['message' => $message]);
    }

    // Bloque para subir y actualizar la foto de perfil en Cloudinary
    public function uploadAvatar(Request $request)
    {
        $user = auth()->user();
        if (!$user) {
            return response()->json(['error' => 'No autenticado'], 401);
        }

        if ($request->hasFile('avatar')) {
            try {
                $uploaded = cloudinary()->uploadApi()->upload($request->file('avatar')->getRealPath(), [
                    'folder' => 'avatars'
                ]);
                $user->avatar_url = $uploaded['secure_url'];
            } catch (\Exception $e) {
                \Log::error('Error subiendo a Cloudinary: ' . $e->getMessage());
                return response()->json(['error' => 'Error al guardar la imagen en la nube.'], 500);
            }
        } elseif ($request->has('avatar_url')) {
            $user->avatar_url = $request->input('avatar_url');
        }

        $user->save();
        return response()->json(['avatar_url' => $user->avatar_url], 200);
    }
}
