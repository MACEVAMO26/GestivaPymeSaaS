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
    // Marcar que el usuario vio el tutorial de IA
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

    public function toggleActivo($id)
    {
        $user = User::findOrFail($id);
        $user->update(['activo' => !$user->activo]);

        return response()->json(['message' => 'Estado del usuario actualizado exitosamente', 'activo' => $user->activo]);
    }

    public function reenviarCredenciales($id)
    {
        $user = User::findOrFail($id);
        $empresa = \App\Models\Empresa::find(auth()->user()->empresa_id);
        
        // Generar nueva contraseña temporal
        $tempPassword = $user->documento;
        $user->update([
            'password_hash' => \Illuminate\Support\Facades\Hash::make($tempPassword),
            'debe_cambiar_clave' => true
        ]);

        try {
            \Mail::to($user->email_personal)->send(new \App\Mail\CredencialesUsuarioMail($user, $tempPassword, $empresa->razon_social));
            
            // Mask the email for security
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

    // Trae los usuarios de la misma empresa (o de cualquier empresa si es SAAS Admin dando soporte)
    public function index(Request $request)
    {
        $user = auth()->user();
        $rol = $user->rol;

        // Modo Dios / Soporte: Si es SAAS Admin y solicita ver otra empresa
        if ($rol && in_array($rol->nombre, ['SAAS Admin', 'SaaS Admin', 'Super Administrador']) && $request->has('empresa_id')) {
            return User::with(['cargo', 'rol', 'empleado.area', 'empleado.cargo', 'empleado.cargo.rol'])
                ->where('empresa_id', $request->empresa_id)
                ->get();
        }

        // Modo Cliente Normal: Encapsulado en su propia empresa
        return User::with(['cargo', 'rol', 'empleado.area', 'empleado.cargo', 'empleado.cargo.rol'])
            ->where('empresa_id', $user->empresa_id)
            ->get();
    }

    // Registra la "cáscara" de un nuevo usuario (Hecho por el Gerente)
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

        // 1. Limpiar strings para generar el correo
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

        // Regla: 2 letras primer nombre + 1 letra segundo nombre + 2 letras primer apellido + 3 letras segundo apellido
        $prefixBase = substr($n1, 0, 2) . substr($n2, 0, 1) . substr($p1, 0, 2) . substr($p2, 0, 3);
        
        $empresa = \App\Models\Empresa::find(auth()->user()->empresa_id);
        $dominioEmpresa = $empresa->dominio ? $empresa->dominio : \Str::slug($empresa->razon_social, "");
        $domain = "@" . $dominioEmpresa . ".gestivapyme.com";
        
        $finalEmail = $prefixBase . $domain;
        
        // Si hay colision, se invierte el orden (Apellidos primero, Nombres despues)
        if (\App\Models\User::where("email", $finalEmail)->exists()) {
            // Regla invertida: 2 letras primer apellido + 1 letra segundo apellido + 2 letras primer nombre + 3 letras segundo nombre
            $prefixInvertido = substr($p1, 0, 2) . substr($p2, 0, 1) . substr($n1, 0, 2) . substr($n2, 0, 3);
            $finalEmail = $prefixInvertido . $domain;
            
            // Si por un milagro sigue habiendo colision (doble tocayo exacto), solo entonces usamos el documento como contingencia absoluta
            if (\App\Models\User::where("email", $finalEmail)->exists()) {
                $finalEmail = $validatedData["documento"] . $domain;
            }
        }

        // La contrasena es el documento de identidad del empleado
        $tempPassword = $validatedData["documento"];

        // 2. Crear el Usuario dentro de una transacción
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

            // LEY: El Jefe de RRHH es el primer cargo que crea el gerente. Si no existe un
            // Jefe de RRHH activo (primer usuario o reemplazo tras despido), este nuevo
            // usuario asume ese cargo y entra FORMALIZADO de inmediato.
            $roleJefe = \App\Models\Role::firstOrCreate(
                ['empresa_id' => auth()->user()->empresa_id, 'nombre' => 'Jefe de Area'],
                ['descripcion' => 'Responsable de su area y formalizacion', 'activo' => true]
            );

            $jefeRRHHActivo = User::where('empresa_id', auth()->user()->empresa_id)
                ->where('rol_id', $roleJefe->id)
                ->where('activo', true)
                ->exists();

            if (!$jefeRRHHActivo) {
                // Hay que buscar el area de RRHH o crearla
                $areaRRHH = \App\Models\Area::firstOrCreate(
                    ['empresa_id' => auth()->user()->empresa_id, 'nombre' => 'Recursos Humanos'],
                    ['descripcion' => 'Area encargada de la gestion del talento humano', 'activo' => true]
                );
                
                $cargoRRHH = \App\Models\Cargo::firstOrCreate(
                    ['empresa_id' => auth()->user()->empresa_id, 'nombre' => 'Jefe de Recursos Humanos'],
                    ['rol_id' => $roleJefe->id, 'area_id' => $areaRRHH->id, 'descripcion' => 'Responsable de la gestion humana de la empresa', 'activo' => true]
                );

                // Asignar el rol al usuario
                $user->rol_id = $roleJefe->id;
                $user->perfil_formalizado = true; // Entra ya formalizado
                $user->save();

                // Asegurar que el Jefe de RRHH tenga acceso a sus modulos
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

                // Formalizar su registro como Empleado
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

        // Enviar el correo con las credenciales usando Brevo (SMTP)
        try {
            $empresa = \App\Models\Empresa::find(auth()->user()->empresa_id);
            \Mail::to($user->email_personal)->send(new \App\Mail\CredencialesUsuarioMail($user, $tempPassword, $empresa->razon_social));
        } catch (\Exception $e) {
            \Log::error("Error enviando correo a {$user->email_personal}: " . $e->getMessage());
            // No detenemos la creación del usuario si falla el envío de correo.
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

    // Trae la informacion de un usuario especifico
    public function show($id)
    {
        return User::findOrFail($id);
    }

    // Actualiza la informacion de un usuario
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

    // Elimina un usuario del sistema
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

    // Activa o inactiva un usuario en el sistema
    public function changeStatus($id)
    {
        $user = User::findOrFail($id);
        $empresaId = auth()->user()->empresa_id;

        $rolUsuario = $user->rol;
        $rolSolicitante = auth()->user()->rol;

        // LEY: El Gerente General es el primer cargo/usuario, no se puede eliminar.
        // Tampoco se puede inactivar desde el aplicativo; solo el SAAS admin puede
        // cambiar sus datos (nombres) cuando la empresa cambia de gerente.
        if ($rolUsuario && $rolUsuario->nombre === 'Gerente General') {
            return response()->json([
                'error' => 'El Gerente General no puede ser inactivado. Solo el SAAS admin puede cambiar sus datos.'
            ], 422);
        }

        // LEY: El Jefe de RRHH solo puede ser inactivado por el Gerente General
        // (por despido), y los datos se conservan por normativa colombiana.
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

    // Sube o actualiza la foto de perfil del usuario
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
