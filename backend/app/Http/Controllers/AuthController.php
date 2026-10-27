<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Bloque para registrar un nuevo usuario en el sistema y retornar su token de acceso
    public function registrar(Request $request)
    {
        // Bloque de reglas de validación de datos del usuario
        $request->validate([
            'nombres' => 'required|string|max:255',
            'apellidos' => 'required|string|max:255',
            'documento' => 'required|string|max:255|unique:usuarios',
            'email' => 'required|string|email|max:255|unique:usuarios',
            'password' => ['required', 'string', \Illuminate\Validation\Rules\Password::min(8)->mixedCase()],
        ]);

        // Bloque de creación del usuario en la base de datos con contraseña cifrada
        $user = User::create([
            'nombres' => $request->nombres,
            'apellidos' => $request->apellidos,
            'documento' => $request->documento,
            'email' => $request->email,
            'password_hash' => Hash::make($request->password) 
        ]);

        // Bloque de generación del token de autenticación Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Usuario registrado exitosamente!',
            'user' => $user,
            'token' => $token
        ], 201);
    }

    // Bloque para iniciar sesión verificando credenciales y retornar los datos del usuario con su token
    public function login(Request $request)
    {
        // Bloque de reglas de validación de credenciales
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $emailLimpio = strtolower(trim($request->email));

        // Bloque de búsqueda optimizada del usuario con relaciones necesarias cargadas
        $user = User::with(['empresa', 'cargo', 'rol', 'empleado.area', 'empleado.cargo'])
                    ->where('email', $emailLimpio)
                    ->orWhereRaw('LOWER(email) = ?', [$emailLimpio])
                    ->first();

        // Bloque de verificación del hash de contraseña
        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        // Bloque de control de cambio de contraseña obligatorio para primer ingreso
        if ($user->debe_cambiar_clave) {
            return response()->json([
                'requires_password_change' => true,
                'email' => $user->email,
                'message' => 'Por seguridad, debes cambiar tu clave inicial antes de continuar.'
            ]);
        }

        // Bloque de control inteligente de sesiones simultáneas por entorno (localhost vs producción)
        $origin = $request->header('Origin', '');
        $referer = $request->header('Referer', '');
        $host = $request->getHost();
        $isLocalhost = str_contains($origin, 'localhost') || str_contains($origin, '127.0.0.1') || 
                       str_contains($referer, 'localhost') || str_contains($referer, '127.0.0.1') ||
                       $host === '127.0.0.1' || $host === 'localhost';

        $tokenName = $isLocalhost ? 'local_token' : 'auth_token';
        $forzarCierre = $request->boolean('force_logout');

        // Bloque para validar si ya existe una sesión activa para este usuario en el mismo entorno
        $tieneSesionActiva = $user->tokens()->where('name', $tokenName)->exists();

        if ($tieneSesionActiva && !$forzarCierre) {
            return response()->json([
                'session_conflict' => true,
                'message' => 'Has iniciado sesión en otro dispositivo, por favor cierra esa sesión e intenta nuevamente.'
            ], 409);
        }

        // Bloque de revocación de sesiones previas en el mismo entorno y generación del nuevo token
        $user->tokens()->where('name', $tokenName)->delete();
        $token = $user->createToken($tokenName)->plainTextToken;

        // Bloque de carga de módulos activos de la empresa para optimizar peticiones del frontend
        $modulosActivos = [];
        if ($user->empresa_id) {
            $modulos = \Illuminate\Support\Facades\DB::table('empresa_modulo')
                        ->where('empresa_id', $user->empresa_id)
                        ->get();
            foreach ($modulos as $mod) {
                $modulosActivos[$mod->modulo_id] = (bool) $mod->activo;
            }
        }

        return response()->json([
            'message' => 'Inicio de sesión exitoso!',
            'user' => $user,
            'modulos_activos' => $modulosActivos,
            'token' => $token
        ]);
    }

    // Bloque para restablecer la contraseña a la clave temporal por defecto (usuario12369) y marcar cambio obligatorio
    public function recuperarPassword(Request $request)
    {
        // Bloque de validación de correo para recuperación
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'Si el correo ingresado se encuentra registrado, su contraseña ha sido restablecida a usuario12369. Inicia sesión con esta clave temporal para definir tu nueva contraseña.'
            ]);
        }

        // Bloque de actualización de contraseña temporal y flag de cambio obligatorio
        $user->password_hash = Hash::make('usuario12369');
        $user->debe_cambiar_clave = true;
        $user->save();

        return response()->json([
            'message' => 'Contraseña restablecida exitosamente a usuario12369. Inicia sesión con esta clave temporal para definir tu nueva contraseña personalizada.'
        ]);
    }

    // Bloque para actualizar la contraseña temporal del usuario y remover el flag de cambio obligatorio
    public function changeInitialPassword(Request $request)
    {
        // Bloque de validación de credencial actual y nueva contraseña con requisitos de seguridad
        $request->validate([
            'email' => 'required|email',
            'current_password' => 'required',
            'new_password' => [
                'required',
                'string',
                \Illuminate\Validation\Rules\Password::min(8)->mixedCase(),
            ],
        ]);

        $user = User::where('email', $request->email)->first();

        // Bloque de validación de contraseña temporal vigente
        if (!$user || !Hash::check($request->current_password, $user->password_hash)) {
            throw ValidationException::withMessages([
                'current_password' => ['La contraseña temporal ingresada no es correcta.'],
            ]);
        }

        if ($request->current_password === $request->new_password) {
            throw ValidationException::withMessages([
                'new_password' => ['La nueva contraseña debe ser diferente a la clave temporal por defecto (usuario12369).'],
            ]);
        }

        // Bloque de guardado de la nueva contraseña cifrada
        $user->password_hash = Hash::make($request->new_password);
        $user->debe_cambiar_clave = false;
        $user->save();

        return response()->json([
            'message' => 'Contraseña actualizada exitosamente. Por favor, inicia sesión de nuevo.'
        ]);
    }

    // Bloque para revocar el token de acceso actual cerrando la sesión del usuario
    public function cerrarSesion(Request $request)
    {
        if ($request->user()) {
            $request->user()->tokens()->delete();
        }
        return response()->json([
            'message' => 'Has cerrado sesión correctamente.'
        ]);
    }
}
