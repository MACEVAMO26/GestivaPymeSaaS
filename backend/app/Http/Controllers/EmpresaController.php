<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use App\Models\Tarifa;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class EmpresaController extends Controller
{
    // Bloque para obtener la lista de todas las empresas registradas incluyendo el usuario gerente
    public function index()
    {
        $empresas = Empresa::orderBy('created_at', 'asc')->get();

        // Bloque para adjuntar el gerente a cada empresa para precarga de datos en el panel SaaS
        $empresas->each(function ($empresa) {
            $rolGerente = \App\Models\Role::where('empresa_id', $empresa->id)
                ->where('nombre', 'Gerente General')->first();
            $gerente = null;
            if ($rolGerente) {
                $gerente = \App\Models\User::where('empresa_id', $empresa->id)
                    ->where('rol_id', $rolGerente->id)
                    ->orderBy('id')->first();
            }
            $empresa->gerente = $gerente ? [
                'id' => $gerente->id,
                'primer_nombre' => $gerente->primer_nombre,
                'segundo_nombre' => $gerente->segundo_nombre,
                'primer_apellido' => $gerente->primer_apellido,
                'segundo_apellido' => $gerente->segundo_apellido,
            ] : null;
        });

        return response()->json($empresas);
    }

    // Bloque para obtener estadísticas de suscripciones y desglose de empresas
    public function suscripcionesStats()
    {
        $empresas = Empresa::with('tarifasCatalogo')->orderBy('created_at', 'asc')->get();
        
        $activosCollection = $empresas->filter(fn($e) => $e->activo == '1' || $e->activo === true || $e->activo === null);
        $mrr = $activosCollection->sum('monto_mensual');
        $clientesActivos = $activosCollection->count();
        $clientesMora = $activosCollection->where('estado_pago', 'mora')->count();
        
        $crecimientoMensual = 12.5;

        $lista = $empresas->map(function ($emp) {
            $tipo = $emp->tipo_empresa;
            
            // Bloque de determinación de módulos transversales activos según catálogo
            $modulosExtra = $emp->tarifasCatalogo->where('tipo', 'modulo_adicional')->count();
            
            // Bloque de estructuración de addons desde el catálogo de tarifas
            $addons = $emp->tarifasCatalogo->where('tipo', 'addon')->map(function ($t) {
                return ['nombre' => $t->nombre, 'valor' => $t->pivot->valor_aplicado];
            })->values()->toArray();

            // Bloque de cálculo de descuentos aplicados desde el catálogo
            $descuentos = $emp->tarifasCatalogo->where('tipo', 'descuento')->map(function ($t) {
                return ['descripcion' => $t->nombre, 'porcentaje' => $t->pivot->valor_aplicado];
            })->values()->toArray();

            // Bloque de construcción del desglose del carrito de compras para el frontend
            $cartItems = $emp->tarifasCatalogo->map(function ($t) {
                return [
                    'id' => $t->id,
                    'cantidad' => $t->pivot->cantidad,
                    'valor_aplicado' => $t->pivot->valor_aplicado
                ];
            })->values()->toArray();

            // Bloque de cálculo de paquetes adicionales según catálogo de tarifas
            $tarifasTipos = $emp->tarifasCatalogo->pluck('tipo', 'id');
            $paquetesAdicionales = [];
            if ($tarifasTipos->has('modulo_rrhh')) $paquetesAdicionales[] = 'Gestión Humana';
            if ($tarifasTipos->has('modulo_finanzas')) $paquetesAdicionales[] = 'Finanzas';
            if ($tarifasTipos->where('tipo', 'addon')->count() > 0) $paquetesAdicionales[] = 'Addons';

            // Bloque de formateo de descuentos definidos desde el formulario de empresa
            $descuentoEmpresa = ($emp->descuento && $emp->descuento !== 'N/A') ? $emp->descuento : 'Ninguno';

            return [
                'id' => $emp->id,
                'empresaId' => $emp->id,
                'nombreEmpresa' => $emp->razon_social,
                'fechaInscripcion' => $emp->fecha_inscripcion ? date('d/M/Y', strtotime($emp->fecha_inscripcion)) : date('d/M/Y'),
                'plan' => $emp->plan_suscripcion ?: 'Mensual',
                'tipoEmpresa' => $tipo,
                'modulosExtra' => $modulosExtra,
                'addonsList' => $addons,
                'descuentosAplicados' => $descuentos,
                'paquetesAdicionales' => count($paquetesAdicionales) ? implode(', ', $paquetesAdicionales) : 'Ninguno',
                'descuentos' => $descuentoEmpresa,
                'proximoPagoTotal' => $emp->monto_mensual ?: 0,
                'fechaProximoPago' => $emp->fecha_proximo_pago ?: date('Y-m-d', strtotime('+30 days')),
                'estado' => $emp->estado_pago === 'mora' ? 'En Mora' : ($emp->estado_pago === 'suspendido' ? 'Inactiva' : 'Activa'),
                'renovaciones' => $emp->renovaciones ?: 0,
                'cartItems' => $cartItems,
                'iaByokActivo' => (bool)$emp->ia_byok_activo,
                'iaByokProveedor' => $emp->ia_byok_proveedor,
                'iaByokModelo' => $emp->ia_byok_modelo,
                'iaByokKeyExists' => !empty($emp->ia_byok_key)
            ];
        });

        return response()->json([
            'stats' => [
                'mrr' => $mrr,
                'clientesActivos' => $clientesActivos,
                'clientesMora' => $clientesMora,
                'crecimientoMensual' => $crecimientoMensual
            ],
            'lista' => $lista
        ]);
    }

    // Bloque para actualizar las tarifas y suscripción personalizada de una empresa
    public function updateTarifas(Request $request, $id)
    {
        $request->validate([
            'tipo_empresa' => 'required|in:Servicios,Ventas,Ventas y Servicios',
            'items' => 'required|array',
            'items.*.id' => 'required|exists:tarifas_catalogo,id',
            'items.*.cantidad' => 'required|integer|min:1',
            'ia_byok_activo' => 'required|boolean',
            'ia_byok_proveedor' => 'nullable|string',
            'ia_byok_key' => 'nullable|string',
            'ia_byok_modelo' => 'nullable|string',
        ]);

        $empresa = Empresa::findOrFail($id);
        
        $tipoEmpresa = $request->tipo_empresa;
        if ($tipoEmpresa === 'Mixto') {
            $tipoEmpresa = 'Ventas y Servicios';
        }

        // Bloque de validación de negocio para paquetes base y módulos adicionales
        $hasBasePackage = in_array($tipoEmpresa, ['Ventas', 'Servicios', 'Ventas y Servicios']);
        
        $subtotal = 0.00;
        $descuentoPorcentaje = 0.00;
        $planSeleccionado = 'Mensual';

        // Bloque de desvinculación de tarifas actuales de la empresa
        $empresa->tarifasCatalogo()->detach();

        // Bloque de procesamiento de ítems del carrito de compras
        foreach ($request->items as $itemData) {
            $tarifa = \App\Models\TarifaCatalogo::findOrFail($itemData['id']);

            // Bloque de validación de restricción de módulos adicionales
            if ($tarifa->tipo === 'modulo_adicional' && !$hasBasePackage) {
                return response()->json([
                    'error' => 'No se pueden asignar módulos adicionales si el tipo de negocio base no está seleccionado.'
                ], 422);
            }

            // Bloque de cálculo de cobro según mecanismo tarifario
            if ($tarifa->mecanismo === 'fijo') {
                $subtotal += $tarifa->valor;
            } elseif ($tarifa->mecanismo === 'por_usuario') {
                $subtotal += ($tarifa->valor * $itemData['cantidad']);
            } elseif ($tarifa->mecanismo === 'porcentaje') {
                $descuentoPorcentaje += $tarifa->valor;
            }

            // Bloque de registro de plan base de la suscripción
            if ($tarifa->tipo === 'plan') {
                $planSeleccionado = str_replace('Plan ', '', $tarifa->nombre);
            }

            // Bloque de guardado de tarifas en la tabla pivote
            $empresa->tarifasCatalogo()->attach($tarifa->id, [
                'cantidad' => $itemData['cantidad'],
                'valor_aplicado' => $tarifa->valor
            ]);
        }

        // Bloque de cálculo y aplicación de descuentos comerciales
        $descuentoMonto = $subtotal * ($descuentoPorcentaje / 100);
        $totalCalculado = max(0, $subtotal - $descuentoMonto);

        // Bloque de configuración de inteligencia artificial con API propia
        $empresa->ia_byok_activo = $request->ia_byok_activo;
        $empresa->ia_byok_proveedor = $request->ia_byok_proveedor;
        $empresa->ia_byok_modelo = $request->ia_byok_modelo;
        if ($request->filled('ia_byok_key')) {
            $empresa->ia_byok_key = \Illuminate\Support\Facades\Crypt::encryptString($request->ia_byok_key);
        }

        // Bloque de guardado y persistencia del modelo de empresa
        $empresa->tipo_empresa = $tipoEmpresa;
        $empresa->plan_suscripcion = $planSeleccionado;
        $empresa->monto_mensual = $totalCalculado;
        $empresa->save();

        // Bloque de sincronización de módulos y áreas según la suscripción pagada
        app(\App\Http\Controllers\ModulosController::class)->sincronizarModulosPorSuscripcion($empresa);

        return response()->json([
            'message' => 'Suscripción y tarifas actualizadas con éxito.',
            'monto_mensual' => $totalCalculado
        ]);
    }

    // Bloque para calcular y retornar las estadísticas generales del sistema
    public function systemStats()
    {
        // Bloque de cálculo del tiempo transcurrido desde la última actividad registrada
        $lastActivityUser = \Illuminate\Support\Facades\DB::table('usuarios')
            ->whereNotNull('last_activity_at')
            ->orderBy('last_activity_at', 'desc')
            ->first();

        $lastActivityDiff = 'Desconocida';
        if ($lastActivityUser) {
            $lastActivityDiff = \Carbon\Carbon::parse($lastActivityUser->last_activity_at)->diffForHumans();
        }

        try {
            \Illuminate\Support\Facades\DB::select('select 1');
            $dbConnection = 'Estable';
        } catch (\Throwable $e) {
            $dbConnection = 'Caída';
        }

        return response()->json([
            'generalUptime' => '99.9%',
            'dbConnection' => $dbConnection,
            'lastBackup' => 'Sin respaldo registrado',
            'lastActivity' => $lastActivityDiff
        ]);
    }

    // Bloque para registrar una nueva empresa y generar automáticamente su usuario gerente administrador
    public function store(Request $request)
    {
        // Bloque de normalización del tipo de empresa si viene como Mixto
        if ($request->input('tipo_empresa') === 'Mixto') {
            $request->merge(['tipo_empresa' => 'Ventas y Servicios']);
        }

        // Bloque de normalización de datos de la empresa y campos del gerente
        if ($request->filled('nombre_gerente') && !$request->filled('primer_nombre_gerente')) {
            $nombres = explode(' ', trim((string)$request->input('nombre_gerente')), 2);
            $request->merge([
                'primer_nombre_gerente' => $nombres[0] ?? 'Gerente',
                'segundo_nombre_gerente' => $nombres[1] ?? null,
            ]);
        }
        if ($request->filled('apellido_gerente') && !$request->filled('primer_apellido_gerente')) {
            $apellidos = explode(' ', trim((string)$request->input('apellido_gerente')), 2);
            $request->merge([
                'primer_apellido_gerente' => $apellidos[0] ?? 'General',
                'segundo_apellido_gerente' => $apellidos[1] ?? null,
            ]);
        }

        $validatedData = $request->validate([
            'razon_social' => 'required|string|max:255',
            'dominio' => 'required|string|unique:empresa,dominio|max:255',
            'nit' => 'required|string|max:255|unique:empresa',
            'tipo_empresa' => 'nullable|in:Servicios,Ventas,Ventas y Servicios,Mixto',
            'plan_suscripcion' => 'nullable|in:Emprendedor,Pyme,Empresarial',
            'direccion' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'ciudad' => 'nullable|string|max:255',
            'logo_url' => 'nullable|string|max:255',
            'color_primario' => 'nullable|string|max:7',
            'color_secundario' => 'nullable|string|max:7',
            'color_fondo' => 'nullable|string|max:7',
            'color_texto' => 'nullable|string|max:7',
            'fecha_inscripcion' => 'nullable|date',
            'descuento' => 'nullable|string|max:255',
            'periodo' => 'nullable|in:Mensual,Anual',
            'primer_nombre_gerente' => 'required|string|max:255',
            'segundo_nombre_gerente' => 'nullable|string|max:255',
            'primer_apellido_gerente' => 'required|string|max:255',
            'segundo_apellido_gerente' => 'nullable|string|max:255',
            'tipo_documento_gerente' => 'nullable|string|max:50',
            'documento_gerente' => 'nullable|string|max:255',
        ], [
            'razon_social.required' => 'La razón social es obligatoria.',
            'dominio.required' => 'El subdominio o ruta de la empresa es obligatorio.',
            'dominio.unique' => 'Este subdominio ya está registrado. Por favor elija o autogenere otro.',
            'nit.required' => 'El NIT o número de identificación es obligatorio.',
            'nit.unique' => 'Ya existe una empresa registrada con este NIT.',
            'tipo_empresa.in' => 'El tipo de empresa seleccionado no es válido.',
            'email.email' => 'El correo electrónico no tiene un formato válido.',
            'primer_nombre_gerente.required' => 'El primer nombre del gerente es obligatorio.',
            'primer_apellido_gerente.required' => 'El primer apellido del gerente es obligatorio.',
        ]);

        // Verificación preventiva de duplicidad de documento en usuarios
        $docGerente = $request->input('documento_gerente') ?: $request->input('nit');
        if ($docGerente && User::where('documento', $docGerente)->exists()) {
            return response()->json([
                'message' => 'El documento de identificación (' . $docGerente . ') ya está registrado para otro usuario.',
                'errors' => ['documento_gerente' => ['El documento de identificación ya se encuentra registrado en el sistema.']]
            ], 422);
        }

        // Bloque de transacción de base de datos para creación atómica de empresa y gerente
        DB::beginTransaction();
        try {

            // Bloque de asignación de fecha obligatoria de inscripción del sistema
            $validatedData['fecha_inscripcion'] = date('Y-m-d');
            // Bloque de inicialización de módulos base por defecto
            $validatedData['tipo_empresa'] = $validatedData['tipo_empresa'] ?? 'Ventas y Servicios';
            $validatedData['plan_suscripcion'] = $validatedData['plan_suscripcion'] ?? 'Emprendedor';
            $empresa = Empresa::create($validatedData);

            // Bloque de construcción de correo máscara institucional usando el dominio
            $adminEmail = 'gerencia@' . $empresa->dominio . '.gestivapyme.com';

            // Bloque de creación del rol Gerente para la empresa
            $rolGerente = \App\Models\Role::create([
                'empresa_id' => $empresa->id,
                'nombre' => 'Gerente General',
                'descripcion' => 'Administrador principal de la empresa',
                'activo' => 1
            ]);

            // Bloque de asignación masiva de permisos al rol Gerente
            $modulos = \Illuminate\Support\Facades\DB::table('modulos')->pluck('id');
            $permisosGerente = [];
            foreach ($modulos as $modId) {
                $permisosGerente[] = [
                    'rol_id' => $rolGerente->id,
                    'modulo_id' => $modId,
                    'puede_ver' => true,
                    'puede_crear' => true,
                    'puede_editar' => true,
                    'puede_inactivar' => true,
                ];
            }
            \Illuminate\Support\Facades\DB::table('permisos')->insert($permisosGerente);

            // Bloque de creación del área corporativa por defecto Gerencia
            $areaGerencia = \App\Models\Area::create([
                'empresa_id' => $empresa->id,
                'nombre' => 'Gerencia',
                'descripcion' => 'Área administrativa y de dirección general',
                'activo' => 1
            ]);

            // Bloque de creación del rol Operativo para personal base
            $rolOperario = \App\Models\Role::create([
                'empresa_id' => $empresa->id,
                'nombre' => 'Operativo',
                'descripcion' => 'Personal operativo. No inactiva ni elimina; solicita al Jefe de Área.',
                'activo' => 1
            ]);

            // Bloque de asignación de permisos base de visualización al rol Operativo
            $permisosOperario = [];
            foreach ($modulos as $modId) {
                $permisosOperario[] = [
                    'rol_id' => $rolOperario->id,
                    'modulo_id' => $modId,
                    'puede_ver' => true,
                    'puede_crear' => false,
                    'puede_editar' => false,
                    'puede_inactivar' => false,
                ];
            }
            \Illuminate\Support\Facades\DB::table('permisos')->insert($permisosOperario);

            // Bloque de creación del cargo Operativo vinculado al rol
            \App\Models\Cargo::create([
                'empresa_id' => $empresa->id,
                'rol_id' => $rolOperario->id,
                'nombre' => 'Operativo',
                'descripcion' => 'Ejecuta tareas operativas del negocio',
                'activo' => 1
            ]);

            // Bloque de creación del cargo por defecto Gerente General
            $cargoGerente = \App\Models\Cargo::create([
                'empresa_id' => $empresa->id,
                'rol_id' => $rolGerente->id,
                'nombre' => 'Gerente General',
                'descripcion' => 'Responsable legal y administrador principal',
                'activo' => 1
            ]);

            // Bloque de creación del usuario gerente con rol administrativo
            $gerenteUser = User::create([
                'empresa_id' => $empresa->id,
                'rol_id' => $rolGerente->id,
                'primer_nombre' => $request->input('primer_nombre_gerente') ?: 'Gerente',
                'segundo_nombre' => $request->input('segundo_nombre_gerente'),
                'primer_apellido' => $request->input('primer_apellido_gerente') ?: $empresa->razon_social,
                'segundo_apellido' => $request->input('segundo_apellido_gerente'),
                'tipo_documento' => $request->input('tipo_documento_gerente') ?: 'CC',
                'documento' => $request->input('documento_gerente') ?: $empresa->nit,
                'email' => $adminEmail,
                'password_hash' => Hash::make($request->input('documento_gerente') ?: $empresa->nit),
                  'email_personal' => $request->input('email'),
                'activo' => 1,
                  'debe_cambiar_clave' => true,
                  'perfil_formalizado' => true
            ]);

            
            // Bloque de creación automática del usuario de pruebas para el tenant
            $testEmail = "test@" . $empresa->dominio . ".gestivapyme.com";
            $testUser = User::create([
                "empresa_id" => $empresa->id,
                "rol_id" => null,
                "primer_nombre" => "Usuario",
                "primer_apellido" => "Pruebas",
                "tipo_documento" => "CC",
                "documento" => "1013608509" . $empresa->id,
                "email" => $testEmail,
                "password_hash" => Hash::make("1013608509"),
                "email_personal" => "test@gestivapyme.com",
                "activo" => 1,
                "debe_cambiar_clave" => false,
                "perfil_formalizado" => true
            ]);

            // Bloque de formalización del usuario gerente como empleado de la empresa
            \App\Models\Empleado::create([
                'usuario_id' => $gerenteUser->id,
                'empresa_id' => $empresa->id,
                'area_id' => $areaGerencia->id,
                'cargo_id' => $cargoGerente->id,
                'tipo_contrato' => 'Indefinido',
                'fecha_contratacion' => date('Y-m-d'),
                'estado' => 'activo'
            ]);

            // Bloque de envío de credenciales transaccionales al correo de contacto vía Brevo
            $tempPassword = $request->input('documento_gerente') ?: $empresa->nit;
            $emailDestino = $gerenteUser->email_personal ?: $empresa->email;

            if (!empty($emailDestino)) {
                try {
                    \Illuminate\Support\Facades\Mail::to($emailDestino)
                        ->send(new \App\Mail\CredencialesUsuarioMail($gerenteUser, $tempPassword, $empresa->razon_social));
                } catch (\Throwable $mErr) {
                    \Illuminate\Support\Facades\Log::error('Error enviando correo de credenciales por Brevo: ' . $mErr->getMessage());
                }
            }

            DB::commit();
            return response()->json([
                'message' => 'Empresa y gerente creados exitosamente.',
                'empresa' => $empresa,
                'admin_email' => $adminEmail,
                'admin_password' => $tempPassword
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Error al crear la empresa: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Error al crear la empresa.',
                'message' => 'Ocurrió un error al guardar la empresa: ' . $e->getMessage()
            ], 500);
        }
    }

    // Bloque para consultar los detalles de una empresa específica
    public function show($id)
    {
        return response()->json(Empresa::findOrFail($id));
    }

    // Bloque para actualizar la información de una empresa existente validando campos obligatorios
    public function update(Request $request, $id)
    {
        $empresa = Empresa::findOrFail($id);

        // Bloque de normalización del tipo de empresa
        if ($request->input('tipo_empresa') === 'Mixto') {
            $request->merge(['tipo_empresa' => 'Ventas y Servicios']);
        }

        $validatedData = $request->validate([
            'razon_social' => 'required|string|max:255',
            'dominio' => ['required', 'string', 'max:255', Rule::unique('empresa')->ignore($empresa->id)],
            'nit' => ['required', 'string', 'max:255', Rule::unique('empresa')->ignore($empresa->id)],
            'tipo_empresa' => 'nullable|in:Servicios,Ventas,Ventas y Servicios,Mixto',
            'plan_suscripcion' => 'nullable|in:Emprendedor,Pyme,Empresarial',
            'direccion' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'ciudad' => 'nullable|string|max:255',
            'logo_url' => 'nullable|string|max:255',
            'color_primario' => 'nullable|string|max:7',
            'fecha_inscripcion' => 'nullable|date',
            'descuento' => 'nullable|string|max:255',
            'periodo' => 'nullable|in:Mensual,Anual',
        ]);

        $empresa->update($validatedData);

        // Bloque de actualización de datos del usuario gerente de la empresa
        $gerenteNombres = $request->only([
            'primer_nombre_gerente', 'segundo_nombre_gerente',
            'primer_apellido_gerente', 'segundo_apellido_gerente'
        ]);

        if (array_filter($gerenteNombres)) {
            $rolGerente = \App\Models\Role::where('empresa_id', $empresa->id)
                ->where('nombre', 'Gerente General')->first();

            if ($rolGerente) {
                $gerenteUser = User::where('empresa_id', $empresa->id)
                    ->where('rol_id', $rolGerente->id)
                    ->orderBy('id')->first();

                if ($gerenteUser) {
                    // Bloque de normalización y ensamblado de nombres y apellidos
                    $primerNombre = trim($gerenteNombres['primer_nombre_gerente'] ?? '');
                    $primerApellido = trim($gerenteNombres['primer_apellido_gerente'] ?? '');
                    $segundoApellido = trim($gerenteNombres['segundo_apellido_gerente'] ?? '');

                    if ($primerNombre === '' || $primerApellido === '' || $segundoApellido === '') {
                        return response()->json([
                            'error' => 'Para cambiar el gerente se requieren: un nombre y dos apellidos (el segundo nombre es opcional).'
                        ], 422);
                    }

                    $gerenteUser->update([
                        'primer_nombre' => $primerNombre,
                        'segundo_nombre' => $gerenteNombres['segundo_nombre_gerente'] ? trim($gerenteNombres['segundo_nombre_gerente']) : null,
                        'primer_apellido' => $primerApellido,
                        'segundo_apellido' => $segundoApellido,
                    ]);
                }
            }
        }

        return response()->json($empresa);
    }

    // Bloque para actualizar la configuración de seguridad social de la empresa
    public function updateRRHHSettings(Request $request)
    {
        $empresaId = auth()->user()->empresa_id;
        $empresa = Empresa::findOrFail($empresaId);

        $validatedData = $request->validate([
            'arl' => 'nullable|string|max:255',
            'caja_compensacion' => 'nullable|string|max:255',
        ]);

        $empresa->update($validatedData);
        return response()->json([
            'message' => 'Configuración de RRHH actualizada correctamente.',
            'empresa' => $empresa
        ]);
    }

    // Bloque para consultar la configuración de RRHH de la empresa
    public function getConfiguracionRRHH($id)
    {
        $empresa = Empresa::findOrFail($id);
        return response()->json([
            'empresa' => $empresa,
            'arl' => $empresa->arl,
            'caja_compensacion' => $empresa->caja_compensacion,
        ]);
    }

    // Bloque para guardar la configuración de RRHH de la empresa
    public function updateConfiguracionRRHH(Request $request, $id)
    {
        $empresa = Empresa::findOrFail($id);

        $validatedData = $request->validate([
            'arl' => 'nullable|string|max:255',
            'caja_compensacion' => 'nullable|string|max:255',
        ]);

        $empresa->update($validatedData);
        return response()->json([
            'message' => 'Configuración de RRHH actualizada correctamente.',
            'empresa' => $empresa
        ]);
    }

    // Bloque para registrar la renovación de suscripción mensual extendiendo fecha de pago
    public function registrarRenovacion($id)
    {
        $empresa = Empresa::findOrFail($id);
        $empresa->renovaciones += 1;
        
        $proximo = $empresa->fecha_proximo_pago ? \Carbon\Carbon::parse($empresa->fecha_proximo_pago) : \Carbon\Carbon::now();
        $empresa->fecha_proximo_pago = $proximo->addDays(30)->format('Y-m-d');
        
        $empresa->save();
        
        return response()->json(['message' => 'Renovación registrada exitosamente', 'empresa' => $empresa]);
    }

    // Bloque para registrar la no renovación de suscripción dejando la empresa inactiva
    public function noRenovar($id)
    {
        $empresa = Empresa::findOrFail($id);
        $empresa->activo = 0;
        $empresa->estado_pago = 'no_renovado';
        $empresa->inactive_at = now();
        $empresa->save();

        return response()->json(['message' => 'Suscripción marcada como no renovada. Empresa inactiva.', 'empresa' => $empresa]);
    }

    // Bloque para alternar el estado operativo y disponibilidad de la empresa
    public function changeStatus(Request $request, $id)
    {
        $empresa = Empresa::findOrFail($id);
        $accion = $request->input('accion');

        if ($accion === 'activar') {
            $empresa->activo = 1;
            $empresa->estado_pago = 'al_dia';
            $empresa->inactive_at = null;
        } elseif ($accion === 'inactivar') {
            $empresa->activo = 0;
            $empresa->inactive_at = now();
        } elseif ($accion === 'mora') {
            $empresa->activo = 1;
            $empresa->estado_pago = 'mora';
        } else {
            $empresa->activo = !$empresa->activo;
            $empresa->inactive_at = $empresa->activo ? null : now();
        }

        $empresa->save();

        $message = $empresa->activo ? 'Empresa activada.' : 'Empresa inactivada.';
        return response()->json(['message' => $message]);
    }

    // Bloque para registrar la firma y aceptación del contrato SaaS con IP y fecha
    public function aceptarContrato(Request $request, $id)
    {
        $empresa = Empresa::findOrFail($id);
        
        $request->validate([
            'firma_base64' => 'required|string'
        ]);

        $empresa->contrato_aceptado = true;
        $empresa->contrato_fecha_aceptacion = now();
        $empresa->contrato_ip_aceptacion = $request->ip();
        $empresa->contrato_firma_path = $request->firma_base64;
        $empresa->save();

        return response()->json(['message' => 'Contrato aceptado exitosamente.']);
    }

    // Bloque para generar y descargar el documento PDF del contrato SaaS de la empresa
    public function descargarContratoPDF($id)
    {
        $empresa = Empresa::findOrFail($id);
        
        if (!$empresa->contrato_id) {
            return response()->json(['error' => 'El contrato aún no ha sido firmado.'], 403);
        }

        // Bloque para consultar la versión del contrato suscrito por la empresa
        $contrato = \App\Models\SaasContrato::find($empresa->contrato_id);
        $contenidoContrato = $contrato ? $contrato->contenido : '<p>Contrato no encontrado</p>';

        // Bloque para obtener los datos del usuario gerente de la empresa
        $gerente = User::where('empresa_id', $empresa->id)
            ->whereHas('rol', function($q) {
                $q->where('nombre', 'like', '%Gerente%');
            })->first();
            
        $nombreGerente = $gerente ? ($gerente->nombres . ' ' . $gerente->apellidos) : 'Representante Legal';
        $documentoGerente = $gerente ? $gerente->documento : 'N/A';

        // Bloque de estructuración de datos para la plantilla del PDF
        $fechaFirmaFormateada = $empresa->fecha_firma ? \Carbon\Carbon::parse($empresa->fecha_firma)->format('d \d\e m \d\e Y, h:i A') : date('d/m/Y');
        
        // Bloque para consultar la configuración de IA asociada a la empresa
        $detalleIa = '';
        if ($empresa->ia_byok_activo) {
            $detalleIa = 'Servicio IA Habilitado bajo el conector de API propia (BYOK) - Sin límites por GestivaPyme.';
        } else {
            $simpleUsers = \DB::table('empresa_tarifas')->where('empresa_id', $empresa->id)->where('tarifa_id', 'ia_simple')->value('cantidad') ?? 0;
            $advancedUsers = \DB::table('empresa_tarifas')->where('empresa_id', $empresa->id)->where('tarifa_id', 'ia_avanzada')->value('cantidad') ?? 0;
            $detalleIa = "Modo Simple: {$simpleUsers} usuarios (15 acciones/día); Modo Avanzado: {$advancedUsers} usuarios (bolsa de 2M tokens/mes, exceso a $15.000 COP por millón).";
        }

        // Bloque de mapeo de variables para sustitución dinámica en el contrato
        $reemplazos = [
            '{CLIENTE_RAZON_SOCIAL}' => $empresa->razon_social,
            '{CLIENTE_NIT}' => $empresa->nit,
            '{CLIENTE_DIRECCION}' => $empresa->direccion ?: 'N/A',
            '{CLIENTE_CIUDAD}' => $empresa->ciudad ?: 'N/A',
            '{CLIENTE_GERENTE}' => $nombreGerente,
            '{CLIENTE_GERENTE_DOC}' => $documentoGerente,
            '{PLAN_CONTRATADO}' => $empresa->plan_suscripcion ?: 'Básico',
            '{TARIFA_MENSUAL}' => '$' . number_format($empresa->monto_mensual) . ' COP',
            '{FECHA_FIRMA}' => $fechaFirmaFormateada,
            '{DETALLE_IA}' => $detalleIa,
            
            // Bloque de definición de datos institucionales del proveedor GestivaPyme
            '{PROVEEDOR_NOMBRE}' => 'GestivaPyme S.A.S',
            '{PROVEEDOR_NIT}' => '901.456.789-0',
            '{PROVEEDOR_REPRESENTANTE}' => 'Representante Legal de GestivaPyme S.A.S',
            '{PROVEEDOR_DIRECCION}' => 'Calle 100 #15-30, Bogotá D.C.',
            '{PROVEEDOR_PAIS}' => 'Colombia'
        ];

        // Bloque de reemplazo de marcadores en el contenido contractual
        $contenidoContrato = str_replace(array_keys($reemplazos), array_values($reemplazos), $contenidoContrato);

        $firmaSrc = $empresa->firma_gerente_url; // Base64 desde frontend

        // Bloque de renderizado HTML del contrato procesado para el motor de PDF
        $html = '
        <div style="font-family: Helvetica, sans-serif; padding: 20px;">
            <div style="margin-bottom: 20px; text-align: right; color: #666; font-size: 11px;">
                Versión del Documento: v' . ($contrato ? $contrato->version : '1.0') . '<br>
                Fecha de Aceptación: ' . $fechaFirmaFormateada . '
            </div>
            
            <div style="text-align: justify; line-height: 1.5; font-size: 12px; color: #1e293b;">
                ' . $contenidoContrato . '
            </div>
            
            <hr style="margin-top: 50px; margin-bottom: 30px; border: 0; border-top: 1px solid #cbd5e1;">
            <div style="text-align: center;">
                <p style="font-size: 11px; color: #64748b;">Aceptado digitalmente el <strong>' . $fechaFirmaFormateada . '</strong>.</p>
                <div style="margin-top: 20px;">
                    ' . ($firmaSrc ? '<img src="' . $firmaSrc . '" style="max-width: 250px; max-height: 100px; border-bottom: 1px solid #000; padding-bottom: 5px;">' : '<div style="width: 250px; height: 60px; border-bottom: 1px solid #000; margin: 0 auto;"></div>') . '
                </div>
                <p style="margin-top: 10px; font-size: 13px; font-weight: bold; color: #0f172a;"><strong>' . $nombreGerente . '</strong></p>
                <p style="font-size: 11px; color: #475569;">Representante Legal - ' . $empresa->razon_social . '</p>
            </div>
        </div>';

        $pdf = Pdf::loadHTML($html);
        return $pdf->download('Contrato_GestivaPyme_' . $empresa->nit . '.pdf');
    }

    public function reenviarCredenciales($id)
    {
        $empresa = Empresa::findOrFail($id);
        
        // Bloque para consultar el usuario gerente de la empresa
        $gerente = \App\Models\User::where('empresa_id', $empresa->id)
                    ->whereHas('rol', function($q) {
                        $q->where('nombre', 'Gerente General');
                    })->first();

        if (!$gerente) {
            return response()->json(['success' => false, 'message' => 'No se encontró el usuario gerente para esta empresa.'], 404);
        }

        if (empty($empresa->email)) {
            return response()->json(['success' => false, 'message' => 'La empresa no tiene un correo de contacto configurado.'], 400);
        }

        // Bloque de generación de nueva contraseña aleatoria
        $tempPassword = 'Admin_' . rand(1000, 9999);
        
        $gerente->password_hash = \Illuminate\Support\Facades\Hash::make($tempPassword);
        $gerente->debe_cambiar_clave = true;
        $gerente->save();

        try {
            \Illuminate\Support\Facades\Mail::to($empresa->email)->send(new \App\Mail\CredencialesUsuarioMail($gerente, $tempPassword, $empresa->razon_social));
            return response()->json(['success' => true, 'message' => 'Credenciales reenviadas al correo de la empresa con éxito.']);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error al reenviar credenciales: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['success' => false, 'message' => 'Error al enviar el correo: ' . $e->getMessage()], 500);
        }
    }
}

