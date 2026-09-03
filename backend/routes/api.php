<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// --- CONTROLADORES DE LA APLICACION ---

// Autenticacion y Seguridad
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\CargoController;
use App\Http\Controllers\PermisoController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AutogestionController;
use App\Http\Controllers\ProfileController;

// Gestion Central del Negocio
use App\Http\Controllers\EmpresaController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\ProveedorController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ServicioController;

// Operaciones Comerciales
use App\Http\Controllers\OrdenCompraController;
use App\Http\Controllers\CotizacionPedidoController;
use App\Http\Controllers\MovimientoInventarioController;


// --- RUTAS PUBLICAS ---
Route::get('/ping', function () { return response()->json('pong'); });
Route::post('/login', [AuthController::class, 'login']);
Route::post('/leads', [\App\Http\Controllers\LeadController::class, 'store']);
Route::post('/change-initial-password', [AuthController::class, 'changeInitialPassword']);
Route::post('/recuperar-password', [AuthController::class, 'recuperarPassword']);

// Modulos
Route::get('/empresas/{id}/modulos', [\App\Http\Controllers\ModulosController::class, 'getModulosPorEmpresa']);
Route::post('/empresas/{id}/modulos/{moduloId}/toggle', [\App\Http\Controllers\ModulosController::class, 'toggleModuloEmpresa']);
Route::post('/empresas/{id}/modulos/paquete', [\App\Http\Controllers\ModulosController::class, 'updatePaqueteEmpresa']);

// Rutas Globales de Módulos (Master)
Route::post('/modulos', [\App\Http\Controllers\ModulosController::class, 'store']);
Route::put('/modulos/{id}', [\App\Http\Controllers\ModulosController::class, 'update']);
Route::delete('/modulos/{id}', [\App\Http\Controllers\ModulosController::class, 'destroy']);

// --- RUTAS PROTEGIDAS (Requieren Token) ---

Route::get('/migrar-bd', function () {
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    return 'Base de datos actualizada exitosamente!';
});

Route::middleware('auth:sanctum')->group(function () {
    
    Route::get('/mis-modulos', [\App\Http\Controllers\ModulosController::class, 'getMisModulos']);

    // --- EXPORTS ---
    Route::get('/export/ventas', [\App\Http\Controllers\ExportController::class, 'exportVentas']);
    Route::get('/export/empleados', [\App\Http\Controllers\ExportController::class, 'exportEmpleados']);
    Route::get('/export/productos', [\App\Http\Controllers\ExportController::class, 'exportProductos']);
    Route::get('/export/proveedores', [\App\Http\Controllers\ExportController::class, 'exportProveedores']);

    // --- SESION ---
    Route::post('/logout', [AuthController::class, 'cerrarSesion']);
    Route::get('/user', function (Request $request) {
        return $request->user()->load(['empresa', 'cargo', 'rol', 'empleado.area', 'empleado.cargo']);
    });

    // --- GESTIVA IA TUTORIAL ---
    Route::get('/tutorial-status', [\App\Http\Controllers\GestivaTutorialController::class, 'getStatus']);

    // --- SEGURIDAD Y ACCESO ---
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/force-password-reset', [ProfileController::class, 'forcePasswordReset']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);

    Route::get('/roles', [RoleController::class, 'index']);
    Route::post('/roles', [RoleController::class, 'store']);
    Route::get('/roles/{id}', [RoleController::class, 'show']);
    Route::put('/roles/{id}', [RoleController::class, 'update']);
    Route::patch('/roles/{id}/status', [RoleController::class, 'changeStatus']);

    // --- PERFIL DE EMPLEADO & AUTOGESTION ---
    Route::get('/empleados/pendientes', [\App\Http\Controllers\EmpleadoController::class, 'pendientes']);
    
    // Documentos del Empleado (RRHH)
    Route::get('/empleados/{id}/documentos', [\App\Http\Controllers\DocumentoEmpleadoController::class, 'getDocumentos']);
    Route::post('/empleados/{id}/documentos', [\App\Http\Controllers\DocumentoEmpleadoController::class, 'store']);
    Route::delete('/documentos/{id}', [\App\Http\Controllers\DocumentoEmpleadoController::class, 'destroy']);
    
    // Autogestion Empleado
    Route::get('/autogestion/stats', [AutogestionController::class, 'getStats']);
    Route::get('/mis-documentos', [\App\Http\Controllers\DocumentoEmpleadoController::class, 'misDocumentos']);

    Route::get('/cargos', [CargoController::class, 'index']);
    Route::post('/cargos', [CargoController::class, 'store']);
    Route::get('/cargos/{id}', [CargoController::class, 'show']);
    Route::put('/cargos/{id}', [CargoController::class, 'update']);
    Route::patch('/cargos/{id}/status', [CargoController::class, 'changeStatus']);


    Route::get('/permisos', [PermisoController::class, 'index']);
    Route::post('/permisos/batch', [PermisoController::class, 'batchUpdate']);
    Route::post('/permisos', [PermisoController::class, 'store']);
    Route::get('/permisos/{id}', [PermisoController::class, 'show']);
    Route::put('/permisos/{id}', [PermisoController::class, 'update']);
    Route::delete('/permisos/{id}', [PermisoController::class, 'destroy']);

    Route::apiResource('sedes', \App\Http\Controllers\SedeController::class)->only(['index', 'store', 'update']);
    Route::get('/areas', [\App\Http\Controllers\AreaController::class, 'index']);
    Route::post('/areas', [\App\Http\Controllers\AreaController::class, 'store']);
    Route::put('/areas/{id}', [\App\Http\Controllers\AreaController::class, 'update']);
    Route::patch('/areas/{id}/status', [\App\Http\Controllers\AreaController::class, 'changeStatus']);

    Route::apiResource('usuarios', UserController::class);
    Route::patch('usuarios/{id}/status', [UserController::class, 'changeStatus']);
    Route::post('usuarios/{id}/reenviar-credenciales', [UserController::class, 'reenviarCredenciales']);

    // --- GESTION HUMANA (Empleados) ---
    Route::get('/empleados', [\App\Http\Controllers\EmpleadoController::class, 'index']);
    Route::get('/empleados/{id}/certificado', [\App\Http\Controllers\EmpleadoController::class, 'generarCertificado']);
    Route::post('/empleados/{usuarioId}/formalizar', [\App\Http\Controllers\EmpleadoController::class, 'formalizar']);
    Route::put('/empleados/{id}', [\App\Http\Controllers\EmpleadoController::class, 'update']);
    Route::put('/empleados/{id}/contrato', [\App\Http\Controllers\EmpleadoController::class, 'updateContrato']);
    Route::post('/empleados/{id}/solicitar-baja', [\App\Http\Controllers\EmpleadoController::class, 'solicitarBaja']);
    Route::post('/empleados/{id}/aprobar-baja', [\App\Http\Controllers\EmpleadoController::class, 'aprobarBaja']);

    // ==========================================
    // RUTAS RESTRINGIDAS (Solo usuarios formalizados)
    // ==========================================
    Route::middleware('formalizado')->group(function () {
    
    Route::get('/autogestion/afiliaciones', [AutogestionController::class, 'misAfiliaciones']);
    Route::post('/autogestion/afiliaciones', [AutogestionController::class, 'guardarAfiliaciones']);


    Route::post('/autogestion/empleado/{id}/afiliaciones', [AutogestionController::class, 'gestionarAfiliacionEmpleado']);


    // --- GESTION CENTRAL (Maestros) ---


    Route::get('empresas/stats/suscripciones', [EmpresaController::class, 'suscripcionesStats']);
    Route::get('empresas/stats/system', [EmpresaController::class, 'systemStats']);
    Route::patch('empresas/{id}/tarifas', [EmpresaController::class, 'updateTarifas']);
    Route::put('empresas/rrhh/settings', [EmpresaController::class, 'updateRRHHSettings']);
    Route::get('empresas/{id}/configuracion-rrhh', [EmpresaController::class, 'getConfiguracionRRHH']);
    Route::post('empresas/{id}/configuracion-rrhh', [EmpresaController::class, 'updateConfiguracionRRHH']);
    Route::apiResource('empresas', EmpresaController::class);
    Route::patch('empresas/{id}/status', [EmpresaController::class, 'changeStatus']);
    Route::patch('empresas/{id}/renovar', [EmpresaController::class, 'registrarRenovacion']);
    Route::patch('empresas/{id}/norenovar', [EmpresaController::class, 'noRenovar']);
    Route::get('empresas/{id}/descargar-contrato', [EmpresaController::class, 'descargarContratoPDF']);
    Route::post('empresas/{id}/reenviar-credenciales', [EmpresaController::class, 'reenviarCredenciales']);

    Route::apiResource('tarifas', \App\Http\Controllers\TarifaController::class)->only(['index', 'update']);

    Route::get('/admin-requests/my-requests', [\App\Http\Controllers\AdminRequestController::class, 'misSolicitudes']);
    Route::get('/admin-requests', [\App\Http\Controllers\AdminRequestController::class, 'index']);
    Route::post('/admin-requests', [\App\Http\Controllers\AdminRequestController::class, 'store']);
    Route::patch('/admin-requests/{id}/process', [\App\Http\Controllers\AdminRequestController::class, 'process']);
    Route::get('/admin-requests/{id}/archivo', [\App\Http\Controllers\AdminRequestController::class, 'descargarArchivo']);
    Route::post('/admin-requests/{id}/importar', [\App\Http\Controllers\AdminRequestController::class, 'importar']);
    Route::post('/admin-requests/{id}/aprobar-importar', [\App\Http\Controllers\AdminRequestController::class, 'aprobarEImportar']);
    
    // --- MIGRACION DE DATOS ---
    Route::get('/migracion/plantilla', [\App\Http\Controllers\MigracionController::class, 'descargarPlantilla']);
    Route::get('/migracion/backup', [\App\Http\Controllers\MigracionController::class, 'descargarBackup']);
    Route::post('/migracion/subir', [\App\Http\Controllers\MigracionController::class, 'subirMigracion']);

    Route::get('/leads', [\App\Http\Controllers\LeadController::class, 'index']);
    Route::patch('/leads/{id}', [\App\Http\Controllers\LeadController::class, 'update']);
    Route::delete('/leads/{id}', [\App\Http\Controllers\LeadController::class, 'destroy']);
    Route::post('/comercial/enviar-masivo', [\App\Http\Controllers\LeadController::class, 'enviarMasivo']);


    Route::apiResource('categorias', CategoriaController::class);
    Route::apiResource('clientes', ClienteController::class);
    Route::apiResource('proveedores', ProveedorController::class);
    Route::apiResource('productos', ProductoController::class)->only(['index', 'store']);
    Route::apiResource('servicios', ServicioController::class);

    // Cuentas por pagar
    Route::apiResource('cuentas-por-pagar', \App\Http\Controllers\CuentaPorPagarController::class);
    Route::post('cuentas-por-pagar/{id}/abonos', [\App\Http\Controllers\CuentaPorPagarController::class, 'registrarAbono']);


    // --- OPERACIONES COMERCIALES ---

    Route::apiResource('ordenes-compra', OrdenCompraController::class);
    Route::apiResource('recepciones', \App\Http\Controllers\RecepcionController::class)->only(['index', 'store', 'show']);
    Route::apiResource('cotizaciones-pedidos', CotizacionPedidoController::class)->only(['index', 'store']);
    Route::put('cotizaciones-pedidos/{id}/estado', [CotizacionPedidoController::class, 'cambiarEstado']);
    Route::apiResource('movimientos-inventario', MovimientoInventarioController::class)->only(['index', 'store']);


    // --- INVENTARIO FISICO ---


    Route::apiResource('inventario', \App\Http\Controllers\InventarioController::class)->only(['index']);
   
    // --- CAJA ---
    Route::get('/cajas', [\App\Http\Controllers\CajaController::class, 'index']);
    Route::post('/cajas', [\App\Http\Controllers\CajaController::class, 'store']);
    Route::post('/cajas/{id}/abrir', [\App\Http\Controllers\CajaController::class, 'abrir']);
    Route::post('/cajas/{id}/cerrar', [\App\Http\Controllers\CajaController::class, 'cerrar']);
    Route::get('/cajas/{id}/movimientos', [\App\Http\Controllers\CajaMovimientoController::class, 'index']);
    Route::post('/cajas/{id}/movimientos', [\App\Http\Controllers\CajaMovimientoController::class, 'store']);

    // --- AGENDA Y CALENDARIO ---
    Route::get('/calendario-eventos', [\App\Http\Controllers\CalendarioEventoController::class, 'index']);
    Route::post('/calendario-eventos', [\App\Http\Controllers\CalendarioEventoController::class, 'store']);
    Route::put('/calendario-eventos/{id}', [\App\Http\Controllers\CalendarioEventoController::class, 'update']);
    Route::delete('/calendario-eventos/{id}', [\App\Http\Controllers\CalendarioEventoController::class, 'destroy']);

    // --- TICKETS DE SERVICIOS (OPERARIOS) ---
    Route::get('/servicios-tickets', [\App\Http\Controllers\TicketServicioController::class, 'index']);
    Route::post('/servicios-tickets', [\App\Http\Controllers\TicketServicioController::class, 'store']);
    Route::put('/servicios-tickets/{id}/estado', [\App\Http\Controllers\TicketServicioController::class, 'cambiarEstado']);
    Route::post('/servicios-tickets/{id}/materiales', [\App\Http\Controllers\TicketServicioController::class, 'agregarMaterial']);

    // --- TURNOS ---


    Route::get('/turnos', [\App\Http\Controllers\TurnoController::class, 'index']);
    Route::post('/turnos', [\App\Http\Controllers\TurnoController::class, 'store']);
    Route::put('/turnos/{id}', [\App\Http\Controllers\TurnoController::class, 'update']);
    Route::patch('/turnos/{id}/status', [\App\Http\Controllers\TurnoController::class, 'changeStatus']);
    

    Route::post('/turnos/{id}/asignar', [\App\Http\Controllers\TurnoController::class, 'asignarTurno']);

    // --- VACACIONES ---
    Route::get('/vacaciones', [\App\Http\Controllers\VacacionController::class, 'index']);
    Route::post('/vacaciones', [\App\Http\Controllers\VacacionController::class, 'store']);
    Route::put('/vacaciones/{id}', [\App\Http\Controllers\VacacionController::class, 'update']);
    

    Route::patch('/vacaciones/{id}/responder', [\App\Http\Controllers\VacacionController::class, 'responderSolicitud']);

    // --- UTILIDAD ---

    // --- TAREAS ---
    Route::get('/tareas', [\App\Http\Controllers\TareaController::class, 'index']);
    Route::post('/tareas', [\App\Http\Controllers\TareaController::class, 'store']);
    Route::put('/tareas/{id}/estado', [\App\Http\Controllers\TareaController::class, 'updateStatus']);

    // --- NOTIFICACIONES ---
    

    Route::get('/notificaciones', [\App\Http\Controllers\NotificacionController::class, 'index']);
    Route::put('/notificaciones/{id}/leer', [\App\Http\Controllers\NotificacionController::class, 'marcarLeida']);

    Route::post('/usuarios/tutorial-visto', [\App\Http\Controllers\UserController::class, 'marcarTutorialVisto']);
    Route::get('/ia/sugerencias', [\App\Http\Controllers\IaController::class, 'getSugerencias']);
    Route::apiResource('ia/directrices', \App\Http\Controllers\IaSugerenciaPersonalizadaController::class);

    // --- LOGS DE AUDITORIA ---
    

    Route::get('/logs', [\App\Http\Controllers\LogAuditoriaController::class, 'index']);


    // --- RECORDATORIOS ---
    Route::get('/recordatorios', [\App\Http\Controllers\RecordatorioController::class, 'index']);
    Route::post('/recordatorios', [\App\Http\Controllers\RecordatorioController::class, 'store']);
    Route::delete('/recordatorios/{id}', [\App\Http\Controllers\RecordatorioController::class, 'destroy']);
    Route::put('/recordatorios/{id}/completado', [\App\Http\Controllers\RecordatorioController::class, 'marcarCompletado']);

    // --- REUNIONES ---
    Route::get('/reuniones', [\App\Http\Controllers\ReunionController::class, 'index']);
    Route::post('/reuniones', [\App\Http\Controllers\ReunionController::class, 'store']);

    // --- SOLICITUDES DE ACCIÓN (OPERARIO -> JEFE DE ÁREA) ---
    Route::get('/solicitudes', [\App\Http\Controllers\SolicitudController::class, 'index']);
    Route::get('/solicitudes/bandeja', [\App\Http\Controllers\SolicitudController::class, 'bandeja']);
    Route::post('/solicitudes', [\App\Http\Controllers\SolicitudController::class, 'store']);
    Route::post('/solicitudes/{id}/responder', [\App\Http\Controllers\SolicitudController::class, 'responder']);
    Route::post('/solicitudes/{id}/aprobar', [\App\Http\Controllers\SolicitudController::class, 'aprobar']);
    Route::post('/solicitudes/{id}/rechazar', [\App\Http\Controllers\SolicitudController::class, 'rechazar']);

    // Ventas
    Route::get('/ventas', [\App\Http\Controllers\VentaController::class, 'index']);
    Route::post('/ventas', [\App\Http\Controllers\VentaController::class, 'store']);
    Route::patch('/ventas/{id}/estado-paquete', [\App\Http\Controllers\VentaController::class, 'updateEstadoPaquete']);
    Route::post('/ventas/{id}/anular', [\App\Http\Controllers\VentaController::class, 'anularVenta']);

    // Soporte Tickets
    Route::get('/soporte', [\App\Http\Controllers\SoporteTicketController::class, 'index']);
    Route::post('/soporte', [\App\Http\Controllers\SoporteTicketController::class, 'store']);
    Route::get('/saas/soporte', [\App\Http\Controllers\SoporteTicketController::class, 'saasIndex']);
    Route::put('/saas/soporte/{id}', [\App\Http\Controllers\SoporteTicketController::class, 'update']);

    // --- MÓDULO IA (SaaS Admin y Gestiva AI) ---
    Route::get('/saas/ia-config', [\App\Http\Controllers\IaConfigController::class, 'index']);
    Route::post('/saas/ia-config', [\App\Http\Controllers\IaConfigController::class, 'store']);
    Route::post('/ia/procesar-tarea', [\App\Http\Controllers\GestivaIaController::class, 'procesarTarea']);
    
    // --- CONTRATO SAAS ---
    Route::get('/saas/contratos', [\App\Http\Controllers\SaasContratoController::class, 'index']);
    Route::post('/saas/contratos', [\App\Http\Controllers\SaasContratoController::class, 'store']);
    Route::get('/saas/contratos/activo', [\App\Http\Controllers\SaasContratoController::class, 'activo']);
    Route::post('/saas/contratos/firmar', [\App\Http\Controllers\SaasContratoController::class, 'firmar']);
    Route::get('/saas/tarifas/catalogo', [\App\Http\Controllers\TarifaController::class, 'catalogo']);
    Route::put('/saas/tarifas/catalogo', [\App\Http\Controllers\TarifaController::class, 'catalogoUpdate']);

    }); // Fin del middleware 'formalizado'

});Route::middleware("auth:sanctum")->post("/empresas/{id}/impersonate-auditor", [\App\Http\Controllers\ImpersonateController::class, "impersonateAuditor"]);
