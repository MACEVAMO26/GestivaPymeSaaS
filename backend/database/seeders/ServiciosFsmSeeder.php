<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Empresa;
use App\Models\Empleado;
use App\Models\Servicio;
use App\Models\Producto;
use App\Models\TicketServicio;
use App\Models\TicketMaterial;
use App\Models\Inventario;
use Carbon\Carbon;

class ServiciosFsmSeeder extends Seeder
{
    public function run(): void
    {
        $empresas = Empresa::where('activo', 1)->get();

        foreach ($empresas as $empresa) {
            echo "Poblando servicios para Empresa {$empresa->id}: {$empresa->razon_social}\n";

            // 1. Asegurar catálogo de servicios base para la empresa
            $serviciosBase = [
                ['nombre' => 'Mantenimiento Preventivo de Servidores y Redes', 'tarifa' => 180000, 'tiempo_estimado' => '2 horas', 'descripcion' => 'Limpieza física, actualización de firmware, revisión de logs y optimización térmica.'],
                ['nombre' => 'Instalación y Configuración de Cámaras de Seguridad IP', 'tarifa' => 220000, 'tiempo_estimado' => '3 horas', 'descripcion' => 'Montaje de cámaras, cableado PoE, configuración de NVR y acceso remoto en app.'],
                ['nombre' => 'Armado y Optimización de Estaciones de Trabajo', 'tarifa' => 150000, 'tiempo_estimado' => '1.5 horas', 'descripcion' => 'Ensamble de hardware, gestión de cables, instalación de SO y pruebas de estrés.'],
                ['nombre' => 'Diagnóstico y Reparación de Equipos en Laboratorio', 'tarifa' => 65000, 'tiempo_estimado' => '1 hora', 'descripcion' => 'Revisión técnica de placas, fuentes, pantallas y componentes electrónicos.'],
                ['nombre' => 'Cableado Estructurado y Certificación de Puntos', 'tarifa' => 120000, 'tiempo_estimado' => '2.5 horas', 'descripcion' => 'Tirada de cable categoría 6, ponchado de jacks, patch panel y certificación de señal.'],
                ['nombre' => 'Recuperación de Datos y Backups Empresariales', 'tarifa' => 250000, 'tiempo_estimado' => '3 horas', 'descripcion' => 'Extracción forense de información, volcado a NAS/Nube y cifrado de seguridad.'],
                ['nombre' => 'Mantenimiento Correctivo de Laptops e Impresoras', 'tarifa' => 95000, 'tiempo_estimado' => '1.5 horas', 'descripcion' => 'Cambio de teclados, bisagras, rodillos de tracción y mantenimiento general.'],
                ['nombre' => 'Soporte Técnico Especializado On-Site', 'tarifa' => 80000, 'tiempo_estimado' => '1 hora', 'descripcion' => 'Asistencia técnica presencial inmediata para resolución de incidencias críticas.']
            ];

            foreach ($serviciosBase as $sb) {
                Servicio::firstOrCreate(
                    ['empresa_id' => $empresa->id, 'nombre' => $sb['nombre']],
                    [
                        'tarifa' => $sb['tarifa'],
                        'tiempo_estimado' => $sb['tiempo_estimado'],
                        'descripcion' => $sb['descripcion'],
                        'activo' => true
                    ]
                );
            }

            // 2. Obtener técnicos operativos de la empresa
            $tecnicos = Empleado::where('empresa_id', $empresa->id)
                ->whereHas('usuario', function ($q) {
                    $q->whereHas('rol', function ($r) {
                        $r->where('nombre', 'like', '%Operativo%')
                          ->orWhere('nombre', 'like', '%Técnico%')
                          ->orWhere('nombre', 'like', '%Servicio%');
                    });
                })->get();

            // Si no hay específicos, tomar cualquier empleado disponible
            if ($tecnicos->isEmpty()) {
                $tecnicos = Empleado::where('empresa_id', $empresa->id)->get();
            }

            $tecnicoIds = $tecnicos->pluck('id')->toArray();
            $tec1 = $tecnicoIds[0] ?? null;
            $tec2 = $tecnicoIds[1] ?? $tec1;
            $tec3 = $tecnicoIds[2] ?? $tec1;

            // Obtener productos disponibles de la empresa para el mini-inventario
            $productos = Producto::where('empresa_id', $empresa->id)->get();
            if ($productos->isEmpty()) {
                $productos = Producto::all();
            }

            // Limpiar tickets antiguos de prueba para poblar conjunto fresco
            TicketServicio::where('empresa_id', $empresa->id)->delete();

            $now = Carbon::now();

            // --- A. SERVICIOS FINALIZADOS (CON ESTADÍSTICAS COMPLETAS) ---
            $finalizadosData = [
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-1001',
                    'cliente_nombre' => 'Clínica Odontológica Sonrisas & Salud',
                    'servicio_requerido' => 'Mantenimiento Preventivo de Servidores y Redes',
                    'fecha_solicitada' => $now->copy()->subDays(5)->toDateString(),
                    'hora_sugerida' => '08:30',
                    'direccion' => 'Av. El Dorado #68C-61, Consultorio 402',
                    'estado' => 'Finalizado',
                    'tecnico_id' => $tec1,
                    'tiempo_minutos' => 110,
                    'costo_total' => 280000,
                    'calificacion_tecnico' => 5,
                    'feedback_tecnico' => 'Excelente servicio, el técnico llegó a tiempo con todos los equipos de diagnóstico y dejó el rack impecable.',
                    'calificacion_cliente' => 5,
                    'feedback_cliente' => 'Cliente muy atento, personal administrativo facilitó las llaves del cuarto de cómputo y firmaron a conformidad.',
                    'notas_ejecucion' => 'Se limpiaron 2 servidores rackeables, cambio de pasta térmica en Xeon E5 y organización de cableado patch cord.',
                    'fecha_finalizacion' => $now->copy()->subDays(5)->setTime(11, 45),
                    'materiales' => [
                        ['qty' => 1, 'name_hint' => 'Router'],
                        ['qty' => 4, 'name_hint' => 'Cable']
                    ]
                ],
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-1002',
                    'cliente_nombre' => 'Logística & Distribución Andina S.A.S',
                    'servicio_requerido' => 'Instalación y Configuración de Cámaras de Seguridad IP',
                    'fecha_solicitada' => $now->copy()->subDays(4)->toDateString(),
                    'hora_sugerida' => '09:00',
                    'direccion' => 'Zona Industrial Cazucá, Bodega 14',
                    'estado' => 'Finalizado',
                    'tecnico_id' => $tec2,
                    'tiempo_minutos' => 170,
                    'costo_total' => 450000,
                    'calificacion_tecnico' => 5,
                    'feedback_tecnico' => 'Instalación limpia, las cámaras cubren los puntos ciegos solicitados y la app móvil quedó configurada.',
                    'calificacion_cliente' => 5,
                    'feedback_cliente' => 'El jefe de seguridad acompañó todo el recorrido en bodega. Excelente trato.',
                    'notas_ejecucion' => 'Instaladas 4 cámaras domo PoE 4MP, configurado DVR con grabación 24/7 y notificación por detección de movimiento.',
                    'fecha_finalizacion' => $now->copy()->subDays(4)->setTime(13, 10),
                    'materiales' => [
                        ['qty' => 2, 'name_hint' => 'Camara'],
                        ['qty' => 1, 'name_hint' => 'Power Bank']
                    ]
                ],
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-1003',
                    'cliente_nombre' => 'Consultoría Jurídica Peña & Asociados',
                    'servicio_requerido' => 'Recuperación de Datos y Backups Empresariales',
                    'fecha_solicitada' => $now->copy()->subDays(3)->toDateString(),
                    'hora_sugerida' => '14:00',
                    'direccion' => 'Carrera 7 #71-21, Torre B Piso 8',
                    'estado' => 'Finalizado',
                    'tecnico_id' => $tec1,
                    'tiempo_minutos' => 135,
                    'costo_total' => 320000,
                    'calificacion_tecnico' => 4,
                    'feedback_tecnico' => 'Muy profesional en la explicación técnica de la recuperación, recuperó toda la base de datos de expedientes.',
                    'calificacion_cliente' => 5,
                    'feedback_cliente' => 'Cliente corporativo con excelente disposición para autorizaciones de volcado.',
                    'notas_ejecucion' => 'Recuperados 450GB de archivos PST y bases de datos contables desde disco secundario con sectores defectuosos.',
                    'fecha_finalizacion' => $now->copy()->subDays(3)->setTime(17, 30),
                    'materiales' => []
                ],
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-1004',
                    'cliente_nombre' => 'Restaurante Gourmet La Casona',
                    'servicio_requerido' => 'Soporte Técnico Especializado On-Site',
                    'fecha_solicitada' => $now->copy()->subDays(2)->toDateString(),
                    'hora_sugerida' => '11:00',
                    'direccion' => 'Calle 85 #12-40, Zona Rosa',
                    'estado' => 'Finalizado',
                    'tecnico_id' => $tec3,
                    'tiempo_minutos' => 55,
                    'costo_total' => 110000,
                    'calificacion_tecnico' => 5,
                    'feedback_tecnico' => 'Resolvió el problema del punto de venta POS y la impresora de comandas en menos de una hora.',
                    'calificacion_cliente' => 4,
                    'feedback_cliente' => 'El administrador estaba ocupado en hora pico de almuerzo pero se logró probar todo correctamente.',
                    'notas_ejecucion' => 'Corrección de conflicto de IP estática en comandera y reinstalación de driver EPSON TM-T20.',
                    'fecha_finalizacion' => $now->copy()->subDays(2)->setTime(12, 15),
                    'materiales' => [
                        ['qty' => 1, 'name_hint' => 'Mouse']
                    ]
                ]
            ];

            foreach ($finalizadosData as $data) {
                $mats = $data['materiales'];
                unset($data['materiales']);
                $data['empresa_id'] = $empresa->id;
                $ticket = TicketServicio::create($data);

                // Agregar materiales utilizados al ticket
                foreach ($mats as $m) {
                    $prod = $productos->first(function ($p) use ($m) {
                        return stripos($p->nombre, $m['name_hint']) !== false;
                    }) ?? $productos->first();

                    if ($prod) {
                        $pUnit = (float)$prod->precio ?: 45000;
                        TicketMaterial::create([
                            'ticket_id' => $ticket->id,
                            'producto_id' => $prod->id,
                            'cantidad' => $m['qty'],
                            'precio_unitario' => $pUnit,
                            'subtotal' => $pUnit * $m['qty'],
                            'estado_material' => 'Utilizado'
                        ]);
                    }
                }
            }

            // --- B. SERVICIOS EN CAMINO (TÉCNICO DIRIGIÉNDOSE AL CLIENTE) ---
            $enCaminoData = [
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-2001',
                    'cliente_nombre' => 'Industrias Plásticas del Valle',
                    'servicio_requerido' => 'Cableado Estructurado y Certificación de Puntos',
                    'fecha_solicitada' => $now->toDateString(),
                    'hora_sugerida' => '10:00',
                    'direccion' => 'Calle 13 #98-45, Parque Industrial Fontibón',
                    'estado' => 'En Camino',
                    'tecnico_id' => $tec1,
                    'costo_total' => 240000,
                    'notas_ejecucion' => 'Técnico despachado en moto de servicio con bobina UTP Cat6, ponchadora, tester Fluke y conectores RJ45 blindados.',
                    'materiales' => [
                        ['qty' => 1, 'name_hint' => 'Router'],
                        ['qty' => 2, 'name_hint' => 'Teclado']
                    ]
                ],
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-2002',
                    'cliente_nombre' => 'Colegio Bilingüe San Mateo',
                    'servicio_requerido' => 'Armado y Optimización de Estaciones de Trabajo',
                    'fecha_solicitada' => $now->toDateString(),
                    'hora_sugerida' => '11:30',
                    'direccion' => 'Transversal 76 #130-15, Suba',
                    'estado' => 'En Camino',
                    'tecnico_id' => $tec2,
                    'costo_total' => 195000,
                    'notas_ejecucion' => 'Técnico en ruta hacia la sala de sistemas. Lleva memorias RAM, pasta térmica y juego de herramientas de precisión.',
                    'materiales' => [
                        ['qty' => 2, 'name_hint' => 'Mouse'],
                        ['qty' => 1, 'name_hint' => 'Audifonos']
                    ]
                ],
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-2003',
                    'cliente_nombre' => 'Supermercado Mercamás Norte',
                    'servicio_requerido' => 'Instalación y Configuración de Cámaras de Seguridad IP',
                    'fecha_solicitada' => $now->toDateString(),
                    'hora_sugerida' => '14:00',
                    'direccion' => 'Carrera 15 #118-20, Unicentro',
                    'estado' => 'En Camino',
                    'tecnico_id' => $tec3,
                    'costo_total' => 310000,
                    'notas_ejecucion' => 'Técnico despachado en vehículo de apoyo con escaleras telescópicas, 2 cámaras domo y switch PoE 8 puertos.',
                    'materiales' => [
                        ['qty' => 2, 'name_hint' => 'Camara'],
                        ['qty' => 1, 'name_hint' => 'Router']
                    ]
                ]
            ];

            foreach ($enCaminoData as $data) {
                $mats = $data['materiales'];
                unset($data['materiales']);
                $data['empresa_id'] = $empresa->id;
                $ticket = TicketServicio::create($data);

                // Mini inventario despachado con el técnico
                foreach ($mats as $m) {
                    $prod = $productos->first(function ($p) use ($m) {
                        return stripos($p->nombre, $m['name_hint']) !== false;
                    }) ?? $productos->first();

                    if ($prod) {
                        $pUnit = (float)$prod->precio ?: 35000;
                        TicketMaterial::create([
                            'ticket_id' => $ticket->id,
                            'producto_id' => $prod->id,
                            'cantidad' => $m['qty'],
                            'precio_unitario' => $pUnit,
                            'subtotal' => $pUnit * $m['qty'],
                            'estado_material' => 'Llevado'
                        ]);
                    }
                }
            }

            // --- C. SERVICIOS EN RECIBIDO DEL CLIENTE (EQUIPOS EN TALLER / RECEPCIÓN) ---
            $recibidosData = [
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-3001',
                    'cliente_nombre' => 'Dra. Patricia Gómez Gómez',
                    'servicio_requerido' => 'Diagnóstico y Reparación de Equipos en Laboratorio',
                    'fecha_solicitada' => $now->toDateString(),
                    'hora_sugerida' => '09:15',
                    'direccion' => 'Sede Central - Taller Laboratorio',
                    'estado' => 'Recibido',
                    'tecnico_id' => $tec1,
                    'equipo_recibido' => 'Laptop ASUS ZenBook 14 OLED UX3402',
                    'serie_equipo' => 'SN-ASUS-9948271',
                    'accesorios_recibidos' => 'Cargador Tipo-C 65W original, Funda de neopreno negra',
                    'falla_reportada' => 'El equipo presenta pantalla azul (BSOD WHEA_UNCORRECTABLE_ERROR) a los 10 minutos de encendido.',
                    'notas_ejecucion' => 'Equipo recibido en recepción técnica. Se asignó a mesa de pruebas para chequeo de NVMe y disipación.',
                    'costo_total' => 95000
                ],
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-3002',
                    'cliente_nombre' => 'Constructora Bolívar & Asociados',
                    'servicio_requerido' => 'Mantenimiento Correctivo de Laptops e Impresoras',
                    'fecha_solicitada' => $now->toDateString(),
                    'hora_sugerida' => '10:45',
                    'direccion' => 'Sede Central - Taller Laboratorio',
                    'estado' => 'Recibido',
                    'tecnico_id' => null,
                    'equipo_recibido' => 'Impresora Multifuncional Epson EcoTank L3250',
                    'serie_equipo' => 'SN-EPS-4481029',
                    'accesorios_recibidos' => 'Cable de poder y cable USB blindado',
                    'falla_reportada' => 'Luces parpadeantes simultáneas (almohadillas de tinta al final de su vida útil) y rayas en impresión negra.',
                    'notas_ejecucion' => 'Pendiente reseteo de contador EEPROM y purga de cabezal por ultrasonido.',
                    'costo_total' => 85000
                ],
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-3003',
                    'cliente_nombre' => 'Estudio Creativo Pixel & Byte',
                    'servicio_requerido' => 'Diagnóstico y Reparación de Equipos en Laboratorio',
                    'fecha_solicitada' => $now->toDateString(),
                    'hora_sugerida' => '11:15',
                    'direccion' => 'Sede Central - Laboratorio de Hardware',
                    'estado' => 'Recibido',
                    'tecnico_id' => $tec2,
                    'equipo_recibido' => 'Torre Workstation personalizada (Ryzen 9 5900X + RTX 3080)',
                    'serie_equipo' => 'SN-CUST-883011',
                    'accesorios_recibidos' => 'Antenas WiFi magnéticas, cable displayport 1.4',
                    'falla_reportada' => 'Se apaga intempestivamente al renderizar en Blender y Adobe Premiere.',
                    'notas_ejecucion' => 'Se sospecha fallo de bomba en refrigeración líquida o caída de voltaje en línea 12V de la fuente de poder.',
                    'costo_total' => 140000
                ]
            ];

            foreach ($recibidosData as $data) {
                $data['empresa_id'] = $empresa->id;
                TicketServicio::create($data);
            }

            // --- D. SERVICIOS PENDIENTES DE ASIGNACIÓN ---
            $pendientesData = [
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-4001',
                    'cliente_nombre' => 'Centro Médico San Cristóbal',
                    'servicio_requerido' => 'Mantenimiento Preventivo de Servidores y Redes',
                    'fecha_solicitada' => $now->copy()->addDay()->toDateString(),
                    'hora_sugerida' => '08:00',
                    'direccion' => 'Calle 45 Sur #20-10, Barrio San Carlos',
                    'estado' => 'Pendiente',
                    'tecnico_id' => null,
                    'costo_total' => 180000,
                    'notas_ejecucion' => 'Solicitud prioritaria recibida por canal web. Mantenimiento previo a auditoría de Secretaría de Salud.'
                ],
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-4002',
                    'cliente_nombre' => 'Agencia de Publicidad Nova Brand',
                    'servicio_requerido' => 'Cableado Estructurado y Certificación de Puntos',
                    'fecha_solicitada' => $now->copy()->addDays(2)->toDateString(),
                    'hora_sugerida' => '14:30',
                    'direccion' => 'Carrera 11 #93A-40, Oficina 501',
                    'estado' => 'Pendiente',
                    'tecnico_id' => null,
                    'costo_total' => 220000,
                    'notas_ejecucion' => 'Ampliación de 8 nuevos puestos de trabajo para equipo de animación digital.'
                ],
                [
                    'consecutivo' => 'TK-' . $empresa->id . '-4003',
                    'cliente_nombre' => 'Colegio Gimnasio Campestre Los Pinos',
                    'servicio_requerido' => 'Instalación y Configuración de Cámaras de Seguridad IP',
                    'fecha_solicitada' => $now->copy()->addDays(3)->toDateString(),
                    'hora_sugerida' => '09:00',
                    'direccion' => 'Km 7 Vía a La Calera',
                    'estado' => 'Pendiente',
                    'tecnico_id' => null,
                    'costo_total' => 380000,
                    'notas_ejecucion' => 'Instalación perimetral de 6 cámaras térmicas en zona de parqueaderos y canchas.'
                ]
            ];

            foreach ($pendientesData as $data) {
                $data['empresa_id'] = $empresa->id;
                TicketServicio::create($data);
            }
        }
    }
}
