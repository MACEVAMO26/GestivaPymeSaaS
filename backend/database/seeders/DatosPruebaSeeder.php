<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Cargo;
use App\Models\Cliente;
use App\Models\Empleado;
use App\Models\Role;
use App\Models\Solicitud;
use App\Models\SolicitudRespuesta;
use App\Models\TicketServicio;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Datos de prueba para la sustentación (empresas demo).
 *
 * Crea:
 *  - Roles base (Gerente General, Jefe de Área, Operario) y áreas.
 *  - Usuarios de demostración: Jefa RRHH (Ana Torres), Coordinadora GH (Laura Gómez)
 *    y Operario (Luis Rojas), con su empleado formalizado y afiliación.
 *  - Permisos base del Operario (solo lectura) en todos los módulos.
 *  - Clientes/proveedores/ticket de ejemplo si la empresa no tiene datos.
 *  - Solicitudes de inactivación con hilo de réplica y trazabilidad
 *    (una ejecutada y una en réplica) para demostrar el flujo.
 *
 * El seeder es idempotente (usa firstOrCreate).
 */
class DatosPruebaSeeder extends Seeder
{
    public function run(): void
    {
        $empresas = \App\Models\Empresa::all();

        foreach ($empresas as $empresa) {
            $e = $empresa->id;

            // ---------- ROLES ----------
            $rolGerente = Role::firstOrCreate(
                ['empresa_id' => $e, 'nombre' => 'Gerente General'],
                ['descripcion' => 'Responsable legal y administrador principal', 'activo' => 1]
            );
            $rolJefe = Role::firstOrCreate(
                ['empresa_id' => $e, 'nombre' => 'Jefe de Área'],
                ['descripcion' => 'Aprueba y ejecuta solicitudes del personal operativo', 'activo' => 1]
            );
            $rolOperario = Role::firstOrCreate(
                ['empresa_id' => $e, 'nombre' => 'Operativo'],
                ['descripcion' => 'Personal operativo. No inactiva ni elimina; solicita al Jefe de Área.', 'activo' => 1]
            );

            // ---------- ÁREAS ----------
            $areaGH = Area::firstOrCreate(
                ['empresa_id' => $e, 'nombre' => 'Recursos Humanos'],
                ['descripcion' => 'Área encargada de contratación, expediente y bienestar', 'activo' => 1]
            );
            $areaTecnica = Area::firstOrCreate(
                ['empresa_id' => $e, 'nombre' => 'Técnica'],
                ['descripcion' => 'Ejecución de servicios en sitio', 'activo' => 1]
            );
            $areaVentas = Area::firstOrCreate(
                ['empresa_id' => $e, 'nombre' => 'Ventas'],
                ['descripcion' => 'Comercialización y atención de clientes', 'activo' => 1]
            );

            // ---------- CARGOS ----------
            $cargoJefeRRHH = Cargo::firstOrCreate(
                ['empresa_id' => $e, 'nombre' => 'Jefe de Recursos Humanos'],
                ['rol_id' => $rolJefe->id, 'descripcion' => 'Responsable de la gestión humana de la empresa', 'activo' => 1]
            );
            $cargoCoordGH = Cargo::firstOrCreate(
                ['empresa_id' => $e, 'nombre' => 'Coordinador de Gestión Humana'],
                ['rol_id' => $rolJefe->id, 'descripcion' => 'Apoya los procesos de RRHH y formalización', 'activo' => 1]
            );
            $cargoOperario = Cargo::firstOrCreate(
                ['empresa_id' => $e, 'nombre' => 'Operativo'],
                ['rol_id' => $rolOperario->id, 'descripcion' => 'Ejecuta tareas operativas del negocio', 'activo' => 1]
            );

            // ---------- USUARIOS DE PRUEBA ----------
            $usuarios = [
                [
                    'clave' => 'ana',
                    'primer_nombre' => 'Ana',
                    'segundo_nombre' => 'María',
                    'primer_apellido' => 'Torres',
                    'segundo_apellido' => 'Díaz',
                    'tipo_documento' => 'CC',
                    'documento' => '1022334455',
                    'rol_id' => $rolJefe->id,
                    'cargo_id' => $cargoJefeRRHH->id,
                    'area_id' => $areaGH->id,
                    'telefono' => '3101112233',
                    'cargo_empleado' => 'Jefe de Recursos Humanos',
                    'codigo' => 'EM-1001',
                ],
                [
                    'clave' => 'laura',
                    'primer_nombre' => 'Laura',
                    'segundo_nombre' => 'Vanessa',
                    'primer_apellido' => 'Gómez',
                    'segundo_apellido' => 'Pardo',
                    'tipo_documento' => 'CC',
                    'documento' => '1023445566',
                    'rol_id' => $rolJefe->id,
                    'cargo_id' => $cargoCoordGH->id,
                    'area_id' => $areaGH->id,
                    'telefono' => '3112223344',
                    'cargo_empleado' => 'Coordinador de Gestión Humana',
                    'codigo' => 'EM-1002',
                ],
                [
                    'clave' => 'luis',
                    'primer_nombre' => 'Luis',
                    'segundo_nombre' => 'Andrés',
                    'primer_apellido' => 'Rojas',
                    'segundo_apellido' => 'Mendoza',
                    'tipo_documento' => 'CC',
                    'documento' => '1024556677',
                    'rol_id' => $rolOperario->id,
                    'cargo_id' => $cargoOperario->id,
                    'area_id' => $areaTecnica->id,
                    'telefono' => '3123334455',
                    'cargo_empleado' => 'Operario Técnico',
                    'codigo' => 'EM-1003',
                ],
            ];

            $creados = [];
            foreach ($usuarios as $u) {
                $email = strtolower("{$u['clave']}.torres.e{$e}@demo.gestivapyme.com");
                if ($u['clave'] === 'laura') {
                    $email = strtolower("laura.gomez.e{$e}@demo.gestivapyme.com");
                }
                if ($u['clave'] === 'luis') {
                    $email = strtolower("luis.rojas.e{$e}@demo.gestivapyme.com");
                }

                $user = User::firstOrCreate(
                    ['email' => $email],
                    [
                        'empresa_id' => $e,
                        'rol_id' => $u['rol_id'],
                        'primer_nombre' => $u['primer_nombre'],
                        'segundo_nombre' => $u['segundo_nombre'],
                        'primer_apellido' => $u['primer_apellido'],
                        'segundo_apellido' => $u['segundo_apellido'],
                        'tipo_documento' => $u['tipo_documento'],
                        'documento' => $u['documento'],
                        'email_personal' => $email,
                        'telefono' => $u['telefono'],
                        'password_hash' => Hash::make($u['documento']),
                        'debe_cambiar_clave' => false,
                        'perfil_formalizado' => true,
                        'activo' => 1,
                    ]
                );

                $creados[$u['clave']] = $user;

                // Empleado formalizado
                Empleado::firstOrCreate(
                    ['usuario_id' => $user->id],
                    [
                        'empresa_id' => $e,
                        'area_id' => $u['area_id'],
                        'cargo_id' => $u['cargo_id'],
                        'codigo_empleado' => $u['codigo'],
                        'fecha_contratacion' => '2026-01-15',
                        'fecha_fin_contrato' => $u['clave'] === 'luis' ? '2026-12-31' : null,
                        'tipo_contrato' => $u['clave'] === 'luis' ? 'Fijo' : 'Indefinido',
                        'salario' => $u['clave'] === 'luis' ? 1800000 : 3200000,
                        'eps' => 'Sura',
                        'arl' => 'Positiva',
                        'fondo_pension' => 'Porvenir',
                        'fondo_cesantias' => 'Porvenir',
                        'estado_afiliacion' => true,
                        'estado' => 'activo',
                    ]
                );

                // Afiliación
                DB::table('afiliaciones')->updateOrInsert(
                    ['user_id' => $user->id],
                    [
                        'eps' => 'Sura',
                        'arl' => 'Positiva',
                        'afondo_pension' => 'Porvenir',
                        'fondo_cesantias' => 'Porvenir',
                        'estado' => 'aprobado',
                        'fecha_contratacion' => '2026-01-15',
                        'veces_modificada' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }

            // ---------- PERMISOS DEL OPERARIO (solo lectura) ----------
            if (isset($creados['luis'])) {
                foreach (DB::table('modulos')->pluck('id') as $modId) {
                    \App\Models\Permiso::firstOrCreate(
                        ['rol_id' => $rolOperario->id, 'modulo_id' => $modId],
                        ['puede_ver' => 1, 'puede_crear' => 0, 'puede_editar' => 0, 'puede_inactivar' => 0, 'puede_descargar' => 0, 'puede_subir' => 0]
                    );
                }
            }

            // ---------- PERMISOS DEL JEFE DE ÁREA (ver todo; gestión total en RRHH) ----------
            if (isset($creados['ana'])) {
                $modulosRRHH = ['r_tur', 'r_aus', 'r_vac'];
                foreach (DB::table('modulos')->pluck('id') as $modId) {
                    \App\Models\Permiso::firstOrCreate(
                        ['rol_id' => $rolJefe->id, 'modulo_id' => $modId],
                        [
                            'puede_ver' => 1,
                            'puede_crear' => in_array($modId, $modulosRRHH) ? 1 : 0,
                            'puede_editar' => in_array($modId, $modulosRRHH) ? 1 : 0,
                            'puede_inactivar' => in_array($modId, $modulosRRHH) ? 1 : 0,
                            'puede_descargar' => 1,
                            'puede_subir' => 1,
                        ]
                    );
                }
            }

            // ---------- DATOS DE EJEMPLO (si la empresa está vacía) ----------
            $clienteDemo = Cliente::firstOrCreate(
                ['empresa_id' => $e, 'documento' => '901234567'],
                [
                    'nombre_razon_social' => 'Clínica San José',
                    'tipo_cliente' => 'Empresa',
                    'email' => 'contacto@clinicasanjose.co',
                    'telefono' => '6017001234',
                    'ciudad' => 'Bogotá',
                    'activo' => 1,
                ]
            );
            Cliente::firstOrCreate(
                ['empresa_id' => $e, 'documento' => '1005678901'],
                [
                    'nombre_razon_social' => 'Martha Lucía Ramírez',
                    'tipo_cliente' => 'Persona',
                    'email' => 'martha.ramirez@mail.com',
                    'telefono' => '3134445566',
                    'ciudad' => 'Bogotá',
                    'activo' => 1,
                ]
            );

            \App\Models\Proveedor::firstOrCreate(
                ['empresa_id' => $e, 'nit' => '830123456-7'],
                [
                    'razon_social' => 'Suministros Técnicos S.A.S.',
                    'contacto' => 'Pedro Villamizar',
                    'email' => 'ventas@suministrostecnicos.co',
                    'telefono' => '6013008877',
                    'direccion' => 'Av. Calle 26 # 69-76',
                    'activo' => 1,
                ]
            );

            $ticketDemo = TicketServicio::firstOrCreate(
                ['empresa_id' => $e, 'cliente_nombre' => 'Clínica San José'],
                [
                    'consecutivo' => 'TK-' . str_pad((string) (DB::table('servicios_tickets')->where('empresa_id', $e)->count() + 1), 4, '0', STR_PAD_LEFT),
                    'servicio_requerido' => 'Mantenimiento preventivo de aires',
                    'fecha_solicitada' => now()->toDateString(),
                    'estado' => 'Asignado',
                    'tecnico_id' => $creados['luis']->empleado->id ?? null,
                ]
            );

            // ---------- CAJA DE EJEMPLO (abierta, para el flujo de inactivación) ----------
            $gerente = User::where('empresa_id', $e)->where('rol_id', $rolGerente->id)->first();
            if ($gerente && DB::table('cajas')->where('empresa_id', $e)->doesntExist()) {
                DB::table('cajas')->insert([
                    'empresa_id' => $e,
                    'usuario_apertura' => $gerente->id,
                    'saldo_inicial' => 500000,
                    'abierta_en' => now()->subDay(),
                    'estado' => 'Abierta',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // ---------- SOLICITUDES CON HILO (trazabilidad) ----------
            $ana = $creados['ana'];
            $luis = $creados['luis'];

            // 1) Solicitud EJECUTADA por el Jefe de Área (con réplica y nota final)
            $solEjecutada = Solicitud::firstOrCreate(
                ['empresa_id' => $e, 'accion' => 'Inactivar registro', 'entidad_id' => $clienteDemo->id, 'estado' => 'ejecutada'],
                [
                    'solicitante_id' => $luis->id,
                    'decisor_id' => $ana->id,
                    'area' => 's_crm',
                    'entidad' => 'clientes',
                    'motivo' => 'El cliente solicita la suspensión temporal de sus servicios por cambio de sede.',
                    'nota_final' => 'Aprobado. Cliente inactivado por 30 días mientras reubica su sede.',
                    'created_at' => now()->subDays(2),
                    'updated_at' => now()->subDay(),
                ]
            );
            SolicitudRespuesta::firstOrCreate(
                ['solicitud_id' => $solEjecutada->id, 'usuario_id' => $ana->id, 'mensaje' => 'Â¿Confirmas que el cliente ya fue notificado del cierre?', 'created_at' => now()->subDays(2)->addHours(2)],
                ['updated_at' => now()->subDays(2)->addHours(2)]
            );
            SolicitudRespuesta::firstOrCreate(
                ['solicitud_id' => $solEjecutada->id, 'usuario_id' => $luis->id, 'mensaje' => 'Sí, el cliente firmó la solicitud de suspensión.', 'created_at' => now()->subDays(2)->addHours(3)],
                ['updated_at' => now()->subDays(2)->addHours(3)]
            );

            // 2) Solicitud EN RÉPLICA (pendiente de aprobación, con intercambio)
            $solReplica = Solicitud::firstOrCreate(
                ['empresa_id' => $e, 'accion' => 'Cancelar ticket', 'entidad_id' => $ticketDemo->id, 'estado' => 'en_replica'],
                [
                    'solicitante_id' => $luis->id,
                    'decisor_id' => $ana->id,
                    'area' => 's_ope',
                    'entidad' => 'tickets',
                    'motivo' => 'El ticket fue generado por error de digitación; el cliente ya tiene servicio asignado.',
                    'created_at' => now()->subHours(5),
                    'updated_at' => now()->subHours(4),
                ]
            );
            SolicitudRespuesta::firstOrCreate(
                ['solicitud_id' => $solReplica->id, 'usuario_id' => $ana->id, 'mensaje' => 'Adjunta la evidencia del ticket duplicado para poder cancelarlo.', 'created_at' => now()->subHours(4)],
                ['updated_at' => now()->subHours(4)]
            );

            // ---------- LOGS DE AUDITORÍA (trazabilidad) ----------
            DB::table('logs_auditoria')->insert([
                [
                    'usuario_id' => $ana->id,
                    'modulo' => 'Solicitudes',
                    'accion' => 'Aprobar y ejecutar',
                    'entidad_afectada_id' => $clienteDemo->id,
                    'descripcion' => "El Jefe de Área aprobó y ejecutó la solicitud #{$solEjecutada->id}: Inactivar registro (cliente).",
                    'ip_origen' => '192.168.1.10',
                    'fecha_hora' => now()->subDay(),
                ],
                [
                    'usuario_id' => $luis->id,
                    'modulo' => 'Solicitudes',
                    'accion' => 'Crear solicitud',
                    'entidad_afectada_id' => $ticketDemo->id,
                    'descripcion' => "El Operario creó la solicitud #{$solReplica->id}: Cancelar ticket.",
                    'ip_origen' => '192.168.1.14',
                    'fecha_hora' => now()->subHours(5),
                ],
            ]);

            $this->command->info("Datos de prueba listos para la empresa {$e} (TechVenta).");
        }
    }
}
