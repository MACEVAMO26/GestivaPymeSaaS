<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // --- AUTENTICACIÓN Y REGISTRO ---
    // Registra un nuevo usuario en el sistema y retorna su token de acceso
    public function registrar(Request $request)
    {
        $request->validate([
            'nombres' => 'required|string|max:255',
            'apellidos' => 'required|string|max:255',
            'documento' => 'required|string|max:255|unique:usuarios',
            'email' => 'required|string|email|max:255|unique:usuarios',
            'password' => ['required', 'string', \Illuminate\Validation\Rules\Password::min(8)->mixedCase()],
        ]);
        $user = User::create([
            'nombres' => $request->nombres,
            'apellidos' => $request->apellidos,
            'documento' => $request->documento,
            'email' => $request->email,
            'password_hash' => Hash::make($request->password) 
        ]);
        $token = $user->createToken('auth_token')->plainTextToken;
        return response()->json([
            'message' => 'Usuario registrado exitosamente!',
            'user' => $user,
            'token' => $token
        ], 201);
    }

    // Inicia sesión verificando credenciales y retorna los datos del usuario con su token
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);
        $user = User::with(['empresa', 'cargo', 'rol', 'empleado.area', 'empleado.cargo'])->where('email', $request->email)->first();
        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        // Exige el cambio de contraseña si es el primer ingreso del usuario
        if ($user->debe_cambiar_clave) {
            return response()->json([
                'requires_password_change' => true,
                'email' => $user->email,
                'message' => 'Por seguridad, debes cambiar tu clave inicial antes de continuar.'
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        // Cargar módulos activos para evitar llamadas extras en el frontend
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

    // Restablece la contraseña del usuario a la clave genérica universal por defecto usuario12369 y activa el flag de cambio obligatorio
    public function recuperarPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'Si el correo ingresado se encuentra registrado, su contraseña ha sido restablecida a usuario12369. Inicia sesión con esta clave temporal para definir tu nueva contraseña.'
            ]);
        }

        $user->password_hash = Hash::make('usuario12369');
        $user->debe_cambiar_clave = true;
        $user->save();

        return response()->json([
            'message' => 'Contraseña restablecida exitosamente a usuario12369. Inicia sesión con esta clave temporal para definir tu nueva contraseña personalizada.'
        ]);
    }

    // Actualiza la contraseña temporal del usuario y desactiva el flag de cambio obligatorio
    public function changeInitialPassword(Request $request)
    {
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

        $user->password_hash = Hash::make($request->new_password);
        $user->debe_cambiar_clave = false;
        $user->save();

        return response()->json([
            'message' => 'Contraseña actualizada exitosamente. Por favor, inicia sesión de nuevo.'
        ]);
    }

    // Revoca el token de acceso actual cerrando la sesión del usuario
    public function cerrarSesion(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json([
            'message' => 'Has cerrado sesión correctamente.'
        ]);
    }
}
