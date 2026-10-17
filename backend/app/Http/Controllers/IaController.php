<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class IaController extends Controller
{
    public function getSugerencias(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $rol = $user->rol->nombre ?? '';
        $area = $request->query('area', 'general'); // ej: ventas, tareas, inicio
        
        $sugerencias = [];

        // Lógica para plan básico: sugerencias estáticas según rol y área
        if (in_array($rol, ['Gerente General', 'Jefe de Área'])) {
            if ($area === 'ventas') {
                $sugerencias = [
                    'Revisa el resumen de ventas semanales.',
                    'Asigna nuevas metas a tu equipo comercial.'
                ];
            } elseif ($area === 'tareas') {
                $sugerencias = [
                    'Asigna tareas pendientes a los empleados inactivos.',
                    'Verifica el estado de las tareas entregadas hoy.'
                ];
            } else {
                $sugerencias = [
                    'Revisa los reportes financieros del mes.',
                    'Verifica si hay solicitudes administrativas pendientes.'
                ];
            }
        } else {
            // Asistente, Operativo, Vendedor
            if ($area === 'ventas') {
                $sugerencias = [
                    '¡Llega a tu meta de ventas de hoy!',
                    'Registra tus cotizaciones pendientes.'
                ];
            } elseif ($area === 'tareas') {
                $sugerencias = [
                    'Revisa tus tareas en estado "En Proceso".',
                    'Recuerda marcar las tareas como terminadas al finalizar.'
                ];
            } else {
                $sugerencias = [
                    'No olvides marcar tu turno de entrada/salida.',
                    '¿Tienes solicitudes pendientes de vacaciones?'
                ];
            }
        }

        // --- FETCH CUSTOM SUGGESTIONS (Directrices IA del Gerente) ---
        // Audiencia: 'Todos', 'Gerencia', 'Ventas', 'RRHH', 'Operativos'
        $audiencias = ['Todos'];
        $rolNombre = strtolower($rol);
        $cargoNombre = strtolower($user->empleado->cargo->nombre ?? ($user->cargo->nombre ?? ''));
        $areaNombre = strtolower($user->empleado->area->nombre ?? '');

        if (str_contains($rolNombre, 'gerente') || str_contains($rolNombre, 'administrador') || str_contains($rolNombre, 'jefe') || str_contains($rolNombre, 'coordinador')) {
            $audiencias[] = 'Gerencia';
        }

        if (str_contains($rolNombre, 'operativo') || str_contains($cargoNombre, 'operativo') || str_contains($rolNombre, 'auxiliar') || !str_contains($rolNombre, 'gerente')) {
            $audiencias[] = 'Operativos';
        }

        if (str_contains($rolNombre, 'venta') || str_contains($cargoNombre, 'venta') || str_contains($areaNombre, 'comercial') || str_contains($areaNombre, 'venta') || $area === 'ventas') {
            $audiencias[] = 'Ventas';
        }

        if (str_contains($rolNombre, 'rrhh') || str_contains($rolNombre, 'humana') || str_contains($cargoNombre, 'rrhh') || str_contains($cargoNombre, 'humana') || str_contains($areaNombre, 'rrhh') || str_contains($areaNombre, 'humana') || $area === 'empleados') {
            $audiencias[] = 'RRHH';
        }

        if (str_contains($rolNombre, 'servicio') || str_contains($cargoNombre, 'servicio') || str_contains($areaNombre, 'servicio') || str_contains($areaNombre, 'operacion') || $area === 'servicios') {
            $audiencias[] = 'Servicios';
            $audiencias[] = 'Operativos';
        }

        if (str_contains($rolNombre, 'inventario') || str_contains($cargoNombre, 'inventario') || str_contains($areaNombre, 'inventario') || str_contains($areaNombre, 'almacen') || str_contains($areaNombre, 'bodega') || $area === 'inventario') {
            $audiencias[] = 'Inventario';
            $audiencias[] = 'Operativos';
        }

        $directrices = \App\Models\IaSugerenciaPersonalizada::where('empresa_id', $user->empresa_id)
            ->where('activo', true)
            ->whereIn('audiencia', array_unique($audiencias))
            ->pluck('mensaje')
            ->toArray();

        // Mezclamos las estáticas con las directrices del gerente (Damos prioridad a las directrices personalizadas)
        $sugerencias = array_merge($directrices, $sugerencias);

        // Limitar a máximo 4 para no saturar la UI
        $sugerencias = array_slice($sugerencias, 0, 4);

        // Registrar la interacción de que la IA sugirió algo (Plan Básico)
        DB::table('ia_chat_history')->insert([
            'empresa_id' => $user->empresa_id,
            'rol' => 'assistant',
            'mensaje' => 'Sugerencias servidas en ' . $area,
            'modo' => 'basico',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'sugerencias' => $sugerencias,
            'directrices' => $directrices,
            'area' => $area,
            'rol' => $rol
        ]);
    }

    /**
     * Devuelve las estadísticas en tiempo real del módulo solicitado
     */
    public function getEstadisticasModulo(Request $request, $modulo = 'general')
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $empresaId = $user->empresa_id;
        $empresa = $user->empresa ?? \App\Models\Empresa::find($empresaId);

        $stats = $this->calcularEstadisticas($empresaId, $modulo);

        return response()->json([
            'success' => true,
            'empresa' => $empresa ? $empresa->razon_social : 'GestivaPyme',
            'nit' => $empresa ? $empresa->nit : '',
            'modulo' => $modulo,
            'data' => $stats
        ]);
    }

    /**
     * Genera y descarga el archivo oficial de Word (.doc / MIME Word) con estadísticas reales
     */
    public function generarInformeWord(Request $request, $modulo = 'general')
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $empresaId = $user->empresa_id;
        $empresa = $user->empresa ?? \App\Models\Empresa::find($empresaId);
        $empresaNombre = $empresa ? $empresa->razon_social : 'Techventas y Soluciones SAS';
        $empresaNit = $empresa ? $empresa->nit : '901.849.201-4';

        $stats = $this->calcularEstadisticas($empresaId, $modulo);
        $htmlWord = $this->construirHtmlWord($modulo, $empresaNombre, $empresaNit, $stats);

        $safeEmpresa = preg_replace('/[^A-Za-z0-9_\-]/', '_', $empresaNombre);
        $filename = "Informe_Ejecutivo_" . ucfirst($modulo) . "_{$safeEmpresa}_" . date('Y-m-d') . ".doc";

        return response($htmlWord, 200, [
            'Content-Type' => 'application/msword; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ]);
    }

    /**
     * Calcula métricas y estadísticas reales de la BD para la empresa
     */
    private function calcularEstadisticas($empresaId, $modulo)
    {
        $modulo = strtolower(trim($modulo));

        if ($modulo === 'ventas') {
            $ventas = \App\Models\Venta::where('empresa_id', $empresaId)->with('cliente')->orderBy('created_at', 'desc')->get();
            $totalVentas = $ventas->count();
            $totalMonto = $ventas->sum('total');
            $ticketPromedio = $totalVentas > 0 ? round($totalMonto / $totalVentas, 2) : 0;
            $ventaMayor = $ventas->max('total') ?: 0;

            $metodos = $ventas->groupBy('metodo_pago')->map(fn($g) => [
                'conteo' => $g->count(),
                'total' => $g->sum('total')
            ]);

            $registros = $ventas->take(15)->map(fn($v) => [
                'col1' => $v->factura_consecutivo ?: ('FAC-' . $v->id),
                'col2' => $v->cliente ? ($v->cliente->nombre_completo ?: ($v->cliente->razon_social ?? 'Consumidor')) : 'Consumidor Final',
                'col3' => $v->created_at ? $v->created_at->format('d/m/Y') : date('d/m/Y'),
                'col4' => ucfirst($v->metodo_pago ?: 'Efectivo'),
                'col5' => '$ ' . number_format($v->total, 2, ',', '.')
            ])->toArray();

            return [
                'titulo' => 'Ventas y Facturación Comercial',
                'kpi1_label' => 'Total Facturado',
                'kpi1_val' => '$ ' . number_format($totalMonto, 2, ',', '.'),
                'kpi2_label' => 'Facturas Emitidas',
                'kpi2_val' => (string)$totalVentas,
                'kpi3_label' => 'Ticket Promedio',
                'kpi3_val' => '$ ' . number_format($ticketPromedio, 2, ',', '.'),
                'kpi4_label' => 'Venta Más Alta',
                'kpi4_val' => '$ ' . number_format($ventaMayor, 2, ',', '.'),
                'headers' => ['Consecutivo', 'Cliente', 'Fecha', 'Método Pago', 'Total'],
                'registros' => $registros,
                'diagnostico' => "El módulo de ventas registra un volumen acumulado de {$totalVentas} operaciones por un valor total de $ " . number_format($totalMonto, 0, ',', '.') . " COP.",
                'recomendacion' => "Se sugiere mantener seguimiento proactivo a clientes recurrentes y verificar que los comprobantes cuadren diariamente con los arqueos de caja."
            ];
        }

        if ($modulo === 'empleados' || $modulo === 'gestion-humana') {
            $empleados = \App\Models\Empleado::where('empresa_id', $empresaId)->with(['cargo', 'area'])->get();
            $totalEmpleados = $empleados->count();
            $activos = $empleados->where('activo', true)->count();
            $formalizados = $empleados->where('formalizado', true)->count();
            $totalNomina = $empleados->sum('salario') ?: 0;

            $registros = $empleados->take(15)->map(fn($e) => [
                'col1' => trim(($e->primer_nombre ?? '') . ' ' . ($e->primer_apellido ?? '')) ?: 'Colaborador',
                'col2' => $e->numero_documento ?? 'N/A',
                'col3' => $e->cargo->nombre ?? 'Operativo',
                'col4' => $e->area->nombre ?? 'General',
                'col5' => $e->formalizado ? 'Formalizado' : 'Pendiente'
            ])->toArray();

            return [
                'titulo' => 'Talento Humano y Nómina',
                'kpi1_label' => 'Total Colaboradores',
                'kpi1_val' => (string)$totalEmpleados,
                'kpi2_label' => 'Personal Activo',
                'kpi2_val' => (string)$activos,
                'kpi3_label' => 'Formalizados',
                'kpi3_val' => (string)$formalizados,
                'kpi4_label' => 'Nómina Mensual Est.',
                'kpi4_val' => '$ ' . number_format($totalNomina, 0, ',', '.'),
                'headers' => ['Nombre Colaborador', 'Documento', 'Cargo', 'Área', 'Estado Legal'],
                'registros' => $registros,
                'diagnostico' => "La empresa cuenta con {$totalEmpleados} empleados registrados, de los cuales {$formalizados} cuentan con proceso de formalización completo.",
                'recomendacion' => "Continuar con el programa de formalización laboral, actualización de contratos y control periódico de afiliaciones a seguridad social."
            ];
        }

        if ($modulo === 'inventario') {
            $productos = \App\Models\Producto::where('empresa_id', $empresaId)->with('categoria')->get();
            $totalProductos = $productos->count();
            $valoracion = $productos->sum(fn($p) => ($p->stock ?? 0) * ($p->precio_venta ?? 0));
            $stockCritico = $productos->filter(fn($p) => ($p->stock ?? 0) <= 5)->count();
            $totalUnidades = $productos->sum('stock');

            $registros = $productos->take(15)->map(fn($p) => [
                'col1' => $p->nombre,
                'col2' => $p->codigo_barras ?? ('SKU-' . $p->id),
                'col3' => $p->categoria->nombre ?? 'General',
                'col4' => (string)($p->stock ?? 0) . ' uds',
                'col5' => '$ ' . number_format($p->precio_venta ?? 0, 2, ',', '.')
            ])->toArray();

            return [
                'titulo' => 'Inventario, Stock y Almacén',
                'kpi1_label' => 'Productos Catalogados',
                'kpi1_val' => (string)$totalProductos,
                'kpi2_label' => 'Unidades Totales',
                'kpi2_val' => (string)$totalUnidades,
                'kpi3_label' => 'Valorización Stock',
                'kpi3_val' => '$ ' . number_format($valoracion, 0, ',', '.'),
                'kpi4_label' => 'Alertas Stock Bajo',
                'kpi4_val' => (string)$stockCritico,
                'headers' => ['Producto', 'Código / SKU', 'Categoría', 'Stock Disponible', 'Precio Venta'],
                'registros' => $registros,
                'diagnostico' => "El catálogo de existencias contiene {$totalProductos} referencias activas con un valor de mercado aproximado de $ " . number_format($valoracion, 0, ',', '.') . " COP.",
                'recomendacion' => "Revisar los {$stockCritico} artículos en stock crítico para coordinar órdenes de compra preventivas con proveedores y evitar desabastecimiento."
            ];
        }

        if ($modulo === 'servicios') {
            $servicios = \App\Models\Servicio::where('empresa_id', $empresaId)->get();
            $tickets = \App\Models\TicketServicio::where('empresa_id', $empresaId)->get();
            $totalServicios = $servicios->count();
            $totalTickets = $tickets->count();
            $pendientes = $tickets->where('estado', 'pendiente')->count();
            $completados = $tickets->where('estado', 'completado')->count();

            $registros = $servicios->take(15)->map(fn($s) => [
                'col1' => $s->nombre,
                'col2' => $s->codigo ?? ('SRV-' . $s->id),
                'col3' => $s->duracion_estimada ? ($s->duracion_estimada . ' min') : 'Variable',
                'col4' => 'Activo',
                'col5' => '$ ' . number_format($s->precio_base ?? 0, 2, ',', '.')
            ])->toArray();

            return [
                'titulo' => 'Catálogo de Servicios y Operaciones',
                'kpi1_label' => 'Servicios Ofrecidos',
                'kpi1_val' => (string)$totalServicios,
                'kpi2_label' => 'Órdenes de Trabajo',
                'kpi2_val' => (string)$totalTickets,
                'kpi3_label' => 'Tickets Pendientes',
                'kpi3_val' => (string)$pendientes,
                'kpi4_label' => 'Servicios Completados',
                'kpi4_val' => (string)$completados,
                'headers' => ['Servicio', 'Código', 'Duración Estimada', 'Estado', 'Precio Base'],
                'registros' => $registros,
                'diagnostico' => "Se registran {$totalServicios} servicios estructurados en el portafolio y {$totalTickets} órdenes tramitadas en el sistema.",
                'recomendacion' => "Monitorear los tiempos de atención de operarios para garantizar el cumplimiento de acuerdos de nivel de servicio (SLA) con clientes."
            ];
        }

        // General / Consolidado
        $ventasTot = \App\Models\Venta::where('empresa_id', $empresaId)->sum('total') ?: 0;
        $ventasCount = \App\Models\Venta::where('empresa_id', $empresaId)->count();
        $empTot = \App\Models\Empleado::where('empresa_id', $empresaId)->count();
        $prodTot = \App\Models\Producto::where('empresa_id', $empresaId)->count();
        $cliTot = \App\Models\Cliente::where('empresa_id', $empresaId)->count();

        return [
            'titulo' => 'Consolidado General de Operaciones Empresariales',
            'kpi1_label' => 'Ventas Totales',
            'kpi1_val' => '$ ' . number_format($ventasTot, 0, ',', '.'),
            'kpi2_label' => 'Clientes Registrados',
            'kpi2_val' => (string)$cliTot,
            'kpi3_label' => 'Colaboradores',
            'kpi3_val' => (string)$empTot,
            'kpi4_label' => 'Productos en Catálogo',
            'kpi4_val' => (string)$prodTot,
            'headers' => ['Indicador Operativo', 'Módulo', 'Registro Actual', 'Estado', 'Objetivo'],
            'registros' => [
                ['col1' => 'Facturación Acumulada', 'col2' => 'Ventas', 'col3' => '$ ' . number_format($ventasTot, 0, ',', '.'), 'col4' => 'Operativo', 'col5' => 'Crecimiento Sostenible'],
                ['col1' => 'Base de Clientes', 'col2' => 'Comercial', 'col3' => "{$cliTot} Clientes", 'col4' => 'Activo', 'col5' => 'Fidelización'],
                ['col1' => 'Fuerza de Trabajo', 'col2' => 'RR. HH.', 'col3' => "{$empTot} Colaboradores", 'col4' => 'Estable', 'col5' => 'Formalización 100%'],
                ['col1' => 'Portafolio de Stock', 'col2' => 'Inventario', 'col3' => "{$prodTot} Referencias", 'col4' => 'Disponible', 'col5' => 'Rotación Óptima']
            ],
            'diagnostico' => "El ecosistema SaaS de la empresa presenta sincronización completa en sus áreas clave: {$ventasCount} ventas procesadas, {$cliTot} clientes activos y {$empTot} colaboradores formalizados.",
            'recomendacion' => "Aprovechar las directrices de gerencia en Gestiva IA para alinear los esfuerzos semanales de cada área hacia las metas estratégicas de crecimiento."
        ];
    }

    /**
     * Construye el documento HTML con formato y estilos nativos para Microsoft Word
     */
    private function construirHtmlWord($modulo, $empresa, $nit, $stats)
    {
        $fecha = date('d/m/Y H:i:s');
        $titulo = $stats['titulo'];

        $rowsHtml = '';
        foreach ($stats['registros'] as $r) {
            $rowsHtml .= "
            <tr>
                <td style='padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10pt;'>{$r['col1']}</td>
                <td style='padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10pt;'>{$r['col2']}</td>
                <td style='padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10pt;'>{$r['col3']}</td>
                <td style='padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10pt;'>{$r['col4']}</td>
                <td style='padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10pt; font-weight: 600; text-align: right;'>{$r['col5']}</td>
            </tr>";
        }

        $headersHtml = '';
        foreach ($stats['headers'] as $h) {
            $headersHtml .= "<th style='background-color: #059669; color: #ffffff; padding: 10px 12px; text-align: left; font-size: 10.5pt; border: 1px solid #047857;'>{$h}</th>";
        }

        return "
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>{$titulo} - {$empresa}</title>
<style>
  @page {
    size: 21.59cm 27.94cm;
    margin: 2.5cm 2.5cm 2.5cm 2.5cm;
    mso-page-orientation: portrait;
  }
  body {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    color: #1e293b;
    font-size: 11pt;
    line-height: 1.5;
  }
</style>
</head>
<body>

  <!-- ENCABEZADO CORPORATIVO -->
  <table style='width: 100%; border-bottom: 3px solid #059669; margin-bottom: 20px; padding-bottom: 12px;'>
    <tr>
      <td style='vertical-align: top;'>
        <div style='font-size: 22pt; font-weight: bold; color: #0f172a; margin: 0;'>{$empresa}</div>
        <div style='font-size: 11pt; color: #475569;'>NIT: {$nit} • GestivaPyme SaaS Enterprise</div>
        <div style='font-size: 15pt; color: #059669; font-weight: bold; margin-top: 8px;'>INFORME EJECUTIVO: " . mb_strtoupper($titulo, 'UTF-8') . "</div>
      </td>
      <td style='text-align: right; vertical-align: top; font-size: 9.5pt; color: #64748b;'>
        <div><strong>Fecha de Emisión:</strong> {$fecha}</div>
        <div><strong>Autor:</strong> Gestiva AI Asistente Inteligente</div>
        <div><strong>Ambiente:</strong> Producción Verificada</div>
      </td>
    </tr>
  </table>

  <!-- RESUMEN EJECUTIVO (KPIs) -->
  <div style='font-size: 13pt; font-weight: bold; color: #0f172a; margin-bottom: 8px;'>1. Resumen de Indicadores Clave de Desempeño (KPIs)</div>
  <table style='width: 100%; margin-bottom: 25px;'>
    <tr>
      <td style='width: 25%; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #059669; padding: 12px; text-align: center;'>
        <div style='font-size: 8.5pt; text-transform: uppercase; color: #047857; font-weight: bold;'>{$stats['kpi1_label']}</div>
        <div style='font-size: 16pt; font-weight: bold; color: #065f46; margin-top: 4px;'>{$stats['kpi1_val']}</div>
      </td>
      <td style='width: 25%; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #059669; padding: 12px; text-align: center;'>
        <div style='font-size: 8.5pt; text-transform: uppercase; color: #047857; font-weight: bold;'>{$stats['kpi2_label']}</div>
        <div style='font-size: 16pt; font-weight: bold; color: #065f46; margin-top: 4px;'>{$stats['kpi2_val']}</div>
      </td>
      <td style='width: 25%; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #059669; padding: 12px; text-align: center;'>
        <div style='font-size: 8.5pt; text-transform: uppercase; color: #047857; font-weight: bold;'>{$stats['kpi3_label']}</div>
        <div style='font-size: 16pt; font-weight: bold; color: #065f46; margin-top: 4px;'>{$stats['kpi3_val']}</div>
      </td>
      <td style='width: 25%; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #059669; padding: 12px; text-align: center;'>
        <div style='font-size: 8.5pt; text-transform: uppercase; color: #047857; font-weight: bold;'>{$stats['kpi4_label']}</div>
        <div style='font-size: 16pt; font-weight: bold; color: #065f46; margin-top: 4px;'>{$stats['kpi4_val']}</div>
      </td>
    </tr>
  </table>

  <!-- DETALLE DE MOVIMIENTOS -->
  <div style='font-size: 13pt; font-weight: bold; color: #0f172a; margin-bottom: 8px;'>2. Detalle y Movimientos Recientes del Sistema</div>
  <table style='width: 100%; border-collapse: collapse; margin-bottom: 25px;'>
    <thead>
      <tr>
        {$headersHtml}
      </tr>
    </thead>
    <tbody>
      {$rowsHtml}
    </tbody>
  </table>

  <!-- ANÁLISIS Y RECOMENDACIÓN DE LA IA -->
  <div style='font-size: 13pt; font-weight: bold; color: #0f172a; margin-bottom: 8px;'>3. Dictamen y Recomendaciones de Gestiva AI</div>
  <table style='width: 100%; background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; padding: 14px 18px; margin-bottom: 30px;'>
    <tr>
      <td>
        <div style='font-weight: bold; color: #1e40af; font-size: 11pt; margin-bottom: 6px;'>Diagnóstico Operativo Automatizado:</div>
        <p style='color: #334155; font-size: 10.5pt; margin: 0 0 10px 0;'>{$stats['diagnostico']}</p>
        <div style='font-weight: bold; color: #1e40af; font-size: 11pt; margin-bottom: 6px;'>Recomendación Estratégica para la Gerencia:</div>
        <p style='color: #334155; font-size: 10.5pt; margin: 0;'>{$stats['recomendacion']}</p>
      </td>
    </tr>
  </table>

  <!-- FIRMA Y PIE DE PÁGINA -->
  <table style='width: 100%; border-top: 1px solid #cbd5e1; padding-top: 15px; margin-top: 30px;'>
    <tr>
      <td style='font-size: 9pt; color: #64748b; text-align: center;'>
        <div><strong>GestivaPyme SaaS v2.0</strong> — Sistema Integral de Gestión Empresarial en la Nube</div>
        <div>Informe emitido con trazabilidad y autenticidad para fines administrativos y auditoría SENA ADSO 2026.</div>
      </td>
    </tr>
  </table>

</body>
</html>";
    }
}
