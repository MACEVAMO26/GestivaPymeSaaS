<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Empresa;
use App\Models\User;
use App\Models\Cliente;
use App\Models\Producto;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\CotizacionPedido;
use App\Models\CotizacionPedidoDetalle;
use App\Models\TicketServicio;
use Carbon\Carbon;

class ClientesVentasServiciosSeeder extends Seeder
{
    public function run(): void
    {
        $empresas = Empresa::where('activo', 1)->get();

        foreach ($empresas as $empresa) {
            echo "--- Sincronizando Clientes, Ventas y Servicios para Empresa {$empresa->id}: {$empresa->razon_social} ---\n";

            $productos = Producto::where('empresa_id', $empresa->id)->get();
            if ($productos->isEmpty()) {
                $productos = Producto::all();
            }

            $user = User::where('empresa_id', $empresa->id)->first() ?? User::first();
            $now = Carbon::now();

            // Lista maestra de clientes con perfil 360 rico
            $clientesData = [
                // 1. Clientes Corporativos / Jurídicos
                [
                    'tipo_cliente' => 'Juridico',
                    'nombre_razon_social' => 'Logística & Distribución Andina S.A.S',
                    'nombres' => 'Logística & Distribución Andina S.A.S',
                    'apellidos' => '',
                    'documento' => 'NIT 900.548.219-3',
                    'email' => 'compras@logisticaandina.com.co',
                    'telefono' => '6017442100',
                    'direccion' => 'Zona Industrial Cazucá, Bodega 14',
                    'ciudad' => 'Bogotá D.C.',
                    'membresia' => 'Corporativo VIP',
                    'pedidos_activos' => 1,
                    'estado_pedido' => 'En camino',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Cliente corporativo de alta prioridad. Contrato marco de mantenimiento y suministro de hardware.',
                    'compras' => [
                        ['dias_atras' => 65, 'subtotal' => 4500000, 'metodo' => 'Transferencia Bancaria'],
                        ['dias_atras' => 25, 'subtotal' => 1850000, 'metodo' => 'PSE'],
                        ['dias_atras' => 4,  'subtotal' => 980000,  'metodo' => 'Transferencia Bancaria'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 70, 'tipo' => 'pedido', 'estado' => 'aprobada', 'total' => 4500000],
                        ['dias_atras' => 10, 'tipo' => 'cotizacion', 'estado' => 'aprobada', 'total' => 980000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Juridico',
                    'nombre_razon_social' => 'Clínica Odontológica Sonrisas & Salud',
                    'nombres' => 'Clínica Odontológica Sonrisas & Salud',
                    'apellidos' => '',
                    'documento' => 'NIT 901.229.410-1',
                    'email' => 'administracion@sonrisasysalud.com',
                    'telefono' => '6013204500',
                    'direccion' => 'Av. El Dorado #68C-61, Consultorio 402',
                    'ciudad' => 'Bogotá D.C.',
                    'membresia' => 'Oro',
                    'pedidos_activos' => 0,
                    'estado_pedido' => 'Entregado',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Red de consultorios odontológicos. Requiere mantenimiento preventivo semestral en red y servidores.',
                    'compras' => [
                        ['dias_atras' => 90, 'subtotal' => 2800000, 'metodo' => 'Tarjeta de Crédito'],
                        ['dias_atras' => 30, 'subtotal' => 750000,  'metodo' => 'PSE'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 35, 'tipo' => 'pedido', 'estado' => 'facturada', 'total' => 750000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Juridico',
                    'nombre_razon_social' => 'Consultoría Jurídica Peña & Asociados',
                    'nombres' => 'Consultoría Jurídica Peña & Asociados',
                    'apellidos' => '',
                    'documento' => 'NIT 830.120.945-8',
                    'email' => 'gerencia@penayasociados.com.co',
                    'telefono' => '6044481020',
                    'direccion' => 'Carrera 7 #71-21, Torre B Piso 8',
                    'ciudad' => 'Medellín',
                    'membresia' => 'Premium',
                    'pedidos_activos' => 0,
                    'estado_pedido' => 'Entregado',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Firma de abogados especializada en derecho corporativo y tributario.',
                    'compras' => [
                        ['dias_atras' => 45, 'subtotal' => 3200000, 'metodo' => 'Transferencia Bancaria'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 50, 'tipo' => 'pedido', 'estado' => 'aprobada', 'total' => 3200000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Juridico',
                    'nombre_razon_social' => 'Industrias Plásticas del Valle',
                    'nombres' => 'Industrias Plásticas del Valle',
                    'apellidos' => '',
                    'documento' => 'NIT 890.312.876-2',
                    'email' => 'planta@plasticosvalle.com',
                    'telefono' => '6026609911',
                    'direccion' => 'Calle 13 #98-45, Parque Industrial Fontibón',
                    'ciudad' => 'Cali',
                    'membresia' => 'Corporativo',
                    'pedidos_activos' => 1,
                    'estado_pedido' => 'En preparación',
                    'estado_financiero' => 'Crédito 30 días',
                    'comentarios' => 'Planta de inyección de plástico. Servicio de cableado y switches en ejecución.',
                    'compras' => [
                        ['dias_atras' => 40, 'subtotal' => 5600000, 'metodo' => 'Crédito Comercial'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 45, 'tipo' => 'pedido', 'estado' => 'convertida', 'total' => 5600000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Juridico',
                    'nombre_razon_social' => 'Colegio Bilingüe San Mateo',
                    'nombres' => 'Colegio Bilingüe San Mateo',
                    'apellidos' => '',
                    'documento' => 'NIT 860.045.192-7',
                    'email' => 'sistemas@sanmateo.edu.co',
                    'telefono' => '6016823344',
                    'direccion' => 'Transversal 76 #130-15, Suba',
                    'ciudad' => 'Bogotá D.C.',
                    'membresia' => 'Institucional',
                    'pedidos_activos' => 1,
                    'estado_pedido' => 'Alistando',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Institución educativa con 3 salas de cómputo y red Wi-Fi campus.',
                    'compras' => [
                        ['dias_atras' => 15, 'subtotal' => 2400000, 'metodo' => 'PSE'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 20, 'tipo' => 'pedido', 'estado' => 'aprobada', 'total' => 2400000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Juridico',
                    'nombre_razon_social' => 'Supermercado Mercamás Norte',
                    'nombres' => 'Supermercado Mercamás Norte',
                    'apellidos' => '',
                    'documento' => 'NIT 900.871.302-4',
                    'email' => 'sistemas@mercamasnorte.com',
                    'telefono' => '6053851122',
                    'direccion' => 'Carrera 15 #118-20, Unicentro',
                    'ciudad' => 'Barranquilla',
                    'membresia' => 'Oro',
                    'pedidos_activos' => 0,
                    'estado_pedido' => 'Entregado',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Cadena de supermercados. Puntos POS y cámaras de seguridad.',
                    'compras' => [
                        ['dias_atras' => 80, 'subtotal' => 6800000, 'metodo' => 'Transferencia Bancaria'],
                        ['dias_atras' => 12, 'subtotal' => 1400000, 'metodo' => 'Efectivo'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 85, 'tipo' => 'pedido', 'estado' => 'facturada', 'total' => 6800000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Juridico',
                    'nombre_razon_social' => 'Constructora Bolívar & Asociados',
                    'nombres' => 'Constructora Bolívar & Asociados',
                    'apellidos' => '',
                    'documento' => 'NIT 800.182.934-0',
                    'email' => 'licitaciones@bolivaryasociados.com',
                    'telefono' => '6012884400',
                    'direccion' => 'Calle 100 #19-61, Piso 5',
                    'ciudad' => 'Bogotá D.C.',
                    'membresia' => 'Corporativo VIP',
                    'pedidos_activos' => 0,
                    'estado_pedido' => 'Entregado',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Desarrollo de proyectos residenciales y comerciales.',
                    'compras' => [
                        ['dias_atras' => 50, 'subtotal' => 7900000, 'metodo' => 'Transferencia Bancaria'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 55, 'tipo' => 'pedido', 'estado' => 'aprobada', 'total' => 7900000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Juridico',
                    'nombre_razon_social' => 'Estudio Creativo Pixel & Byte',
                    'nombres' => 'Estudio Creativo Pixel & Byte',
                    'apellidos' => '',
                    'documento' => 'NIT 901.442.810-6',
                    'email' => 'hola@pixelbyte.co',
                    'telefono' => '6076329080',
                    'direccion' => 'Carrera 27 #36-14, Cabecera',
                    'ciudad' => 'Bucaramanga',
                    'membresia' => 'Estándar',
                    'pedidos_activos' => 0,
                    'estado_pedido' => 'Entregado',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Agencia de animación 3D y diseño. Equipo en taller para diagnóstico de workstation.',
                    'compras' => [
                        ['dias_atras' => 30, 'subtotal' => 1250000, 'metodo' => 'Tarjeta de Crédito'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 35, 'tipo' => 'cotizacion', 'estado' => 'aprobada', 'total' => 1250000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Juridico',
                    'nombre_razon_social' => 'Centro Médico San Cristóbal',
                    'nombres' => 'Centro Médico San Cristóbal',
                    'apellidos' => '',
                    'documento' => 'NIT 899.999.040-5',
                    'email' => 'operaciones@medicosancristobal.com',
                    'telefono' => '6013689020',
                    'direccion' => 'Calle 45 Sur #20-10, Barrio San Carlos',
                    'ciudad' => 'Bogotá D.C.',
                    'membresia' => 'Premium',
                    'pedidos_activos' => 1,
                    'estado_pedido' => 'Pendiente despacho',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Centro de diagnóstico médico y laboratorio clínico.',
                    'compras' => [
                        ['dias_atras' => 22, 'subtotal' => 3400000, 'metodo' => 'Transferencia Bancaria'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 25, 'tipo' => 'pedido', 'estado' => 'aprobada', 'total' => 3400000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Juridico',
                    'nombre_razon_social' => 'Agencia de Publicidad Nova Brand',
                    'nombres' => 'Agencia de Publicidad Nova Brand',
                    'apellidos' => '',
                    'documento' => 'NIT 901.780.221-9',
                    'email' => 'contacto@novabrand.co',
                    'telefono' => '6043128890',
                    'direccion' => 'Carrera 11 #93A-40, Oficina 501',
                    'ciudad' => 'Medellín',
                    'membresia' => 'Estándar',
                    'pedidos_activos' => 0,
                    'estado_pedido' => 'Entregado',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Agencia boutique de branding digital.',
                    'compras' => [
                        ['dias_atras' => 18, 'subtotal' => 890000, 'metodo' => 'PSE'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 20, 'tipo' => 'cotizacion', 'estado' => 'enviada', 'total' => 890000],
                    ]
                ],

                // 2. Personas Naturales / Profesionales
                [
                    'tipo_cliente' => 'Natural',
                    'nombre_razon_social' => '',
                    'nombres' => 'Patricia',
                    'apellidos' => 'Gómez Gómez',
                    'documento' => 'CC 52.489.102',
                    'email' => 'patricia.gomez@saludmed.com',
                    'telefono' => '3158902341',
                    'direccion' => 'Carrera 19A #104-32, Apto 502',
                    'ciudad' => 'Bogotá D.C.',
                    'membresia' => 'VIP',
                    'pedidos_activos' => 0,
                    'estado_pedido' => 'Entregado',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Médica cirujana. Dejó su laptop Asus Zenbook en taller para diagnóstico de placa y disipación.',
                    'compras' => [
                        ['dias_atras' => 45, 'subtotal' => 1890000, 'metodo' => 'Tarjeta de Crédito'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 48, 'tipo' => 'pedido', 'estado' => 'facturada', 'total' => 1890000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Natural',
                    'nombre_razon_social' => '',
                    'nombres' => 'Fernando',
                    'apellidos' => 'Mendoza Restrepo',
                    'documento' => 'CC 79.845.120',
                    'email' => 'fmendoza.ing@gmail.com',
                    'telefono' => '3104556789',
                    'direccion' => 'Calle 10 #43E-20, El Poblado',
                    'ciudad' => 'Medellín',
                    'membresia' => 'Oro',
                    'pedidos_activos' => 0,
                    'estado_pedido' => 'Entregado',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Ingeniero civil independiente. Compra constante de accesorios y licencias.',
                    'compras' => [
                        ['dias_atras' => 60, 'subtotal' => 1100000, 'metodo' => 'PSE'],
                        ['dias_atras' => 5,  'subtotal' => 450000,  'metodo' => 'Tarjeta de Crédito'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 62, 'tipo' => 'pedido', 'estado' => 'aprobada', 'total' => 1100000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Natural',
                    'nombre_razon_social' => '',
                    'nombres' => 'Claudia Marcela',
                    'apellidos' => 'Cardona Varela',
                    'documento' => 'CC 43.910.228',
                    'email' => 'claudia.cardona@odontoclinic.co',
                    'telefono' => '3187654321',
                    'direccion' => 'Avenida 6N #22-08, Santa Mónica',
                    'ciudad' => 'Cali',
                    'membresia' => 'Premium',
                    'pedidos_activos' => 0,
                    'estado_pedido' => 'Entregado',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Especialista en ortodoncia digital.',
                    'compras' => [
                        ['dias_atras' => 35, 'subtotal' => 2150000, 'metodo' => 'Transferencia Bancaria'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 40, 'tipo' => 'pedido', 'estado' => 'aprobada', 'total' => 2150000],
                    ]
                ],
                [
                    'tipo_cliente' => 'Natural',
                    'nombre_razon_social' => '',
                    'nombres' => 'Alejandro',
                    'apellidos' => 'Morales Quintero',
                    'documento' => 'CC 80.194.550',
                    'email' => 'arq.morales@estudiomorales.com',
                    'telefono' => '3209871122',
                    'direccion' => 'Carrera 9 #80-15, Chicó',
                    'ciudad' => 'Bogotá D.C.',
                    'membresia' => 'Regular',
                    'pedidos_activos' => 0,
                    'estado_pedido' => 'Entregado',
                    'estado_financiero' => 'Al día',
                    'comentarios' => 'Arquitecto y modelador BIM.',
                    'compras' => [
                        ['dias_atras' => 70, 'subtotal' => 3500000, 'metodo' => 'Transferencia Bancaria'],
                    ],
                    'cotizaciones' => [
                        ['dias_atras' => 75, 'tipo' => 'pedido', 'estado' => 'facturada', 'total' => 3500000],
                    ]
                ]
            ];

            $facturaSeq = 1001;

            foreach ($clientesData as $cData) {
                $compras = $cData['compras'];
                $cotizaciones = $cData['cotizaciones'];
                unset($cData['compras'], $cData['cotizaciones']);

                $cData['empresa_id'] = $empresa->id;
                $cData['activo'] = 1;

                // Buscar o crear cliente
                $cliente = Cliente::updateOrCreate(
                    ['empresa_id' => $empresa->id, 'documento' => $cData['documento']],
                    $cData
                );

                $nombreClientePrincipal = $cliente->nombre_razon_social ?: "{$cliente->nombres} {$cliente->apellidos}";

                // Sincronizar tickets de servicio con el cliente_id
                TicketServicio::where('empresa_id', $empresa->id)
                    ->where(function($q) use ($nombreClientePrincipal, $cliente) {
                        $q->whereRaw('LOWER(cliente_nombre) = ?', [strtolower(trim($nombreClientePrincipal))])
                          ->orWhereRaw('LOWER(cliente_nombre) LIKE ?', ['%' . strtolower(trim($cliente->nombres)) . '%']);
                    })
                    ->update(['cliente_id' => $cliente->id]);

                // Generar Ventas / Facturas cronológicas
                foreach ($compras as $cmp) {
                    $fechaVenta = $now->copy()->subDays($cmp['dias_atras'])->setTime(rand(9, 17), rand(0, 59));
                    $facturaNum = "FAC-{$empresa->id}-" . str_pad((string)$facturaSeq++, 5, '0', STR_PAD_LEFT);
                    
                    $subtotal = $cmp['subtotal'];
                    $impuestos = $subtotal * 0.19;
                    $total = $subtotal + $impuestos;

                    $venta = Venta::updateOrCreate(
                        ['empresa_id' => $empresa->id, 'factura_consecutivo' => $facturaNum],
                        [
                            'cliente_id' => $cliente->id,
                            'subtotal' => $subtotal,
                            'impuestos' => $impuestos,
                            'descuentos' => 0,
                            'total' => $total,
                            'metodo_pago' => $cmp['metodo'],
                            'estado' => 'Pagado',
                            'estado_paquete' => 'Entregado',
                            'vendedor_id' => $user->id,
                            'created_at' => $fechaVenta,
                            'updated_at' => $fechaVenta,
                        ]
                    );

                    // Detalle de productos comprados
                    VentaDetalle::where('venta_id', $venta->id)->delete();
                    $prod1 = $productos->random() ?? $productos->first();
                    $prod2 = $productos->where('id', '!=', $prod1->id)->first() ?? $prod1;

                    if ($prod1) {
                        VentaDetalle::create([
                            'venta_id' => $venta->id,
                            'producto_id' => $prod1->id,
                            'cantidad' => 2,
                            'precio_unitario' => $subtotal * 0.6 / 2,
                            'subtotal' => $subtotal * 0.6,
                            'impuesto' => ($subtotal * 0.6) * 0.19,
                            'total' => ($subtotal * 0.6) * 1.19,
                            'created_at' => $fechaVenta,
                            'updated_at' => $fechaVenta
                        ]);
                    }
                    if ($prod2 && $prod2->id !== $prod1->id) {
                        VentaDetalle::create([
                            'venta_id' => $venta->id,
                            'producto_id' => $prod2->id,
                            'cantidad' => 1,
                            'precio_unitario' => $subtotal * 0.4,
                            'subtotal' => $subtotal * 0.4,
                            'impuesto' => ($subtotal * 0.4) * 0.19,
                            'total' => ($subtotal * 0.4) * 1.19,
                            'created_at' => $fechaVenta,
                            'updated_at' => $fechaVenta
                        ]);
                    }
                }

                // Generar Cotizaciones / Pedidos
                foreach ($cotizaciones as $cot) {
                    $fechaCot = $now->copy()->subDays($cot['dias_atras'])->setTime(rand(9, 17), rand(0, 59));
                    $cotPed = CotizacionPedido::updateOrCreate(
                        ['cliente_id' => $cliente->id, 'usuario_id' => $user->id, 'tipo' => $cot['tipo'], 'total' => $cot['total']],
                        [
                            'estado' => $cot['estado'],
                            'descuento' => 0,
                            'fecha_hora' => $fechaCot,
                            'created_at' => $fechaCot,
                            'updated_at' => $fechaCot
                        ]
                    );

                    CotizacionPedidoDetalle::where('cotizacion_pedido_id', $cotPed->id)->delete();
                    $prod = $productos->random() ?? $productos->first();
                    if ($prod) {
                        CotizacionPedidoDetalle::create([
                            'cotizacion_pedido_id' => $cotPed->id,
                            'tipo_item' => 'producto',
                            'item_id' => $prod->id,
                            'cantidad' => 1,
                            'precio_unitario' => $cot['total'],
                            'subtotal' => $cot['total'],
                            'created_at' => $fechaCot,
                            'updated_at' => $fechaCot
                        ]);
                    }
                }
            }
        }
    }
}
