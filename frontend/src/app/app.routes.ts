import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
    { path: '', loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
    { path: 'login', loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent) },
    { path: 'login/:empresa', loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent) },
    { path: 'saas-admin', redirectTo: 'saas-admin/dashboard', pathMatch: 'full' },
    { path: 'saas-admin/:vista', loadComponent: () => import('./pages/saas-admin/saas-admin.component').then(m => m.SaasAdminComponent), canActivate: [authGuard] },
    
    // Módulo Cliente Unificado
    { 
        path: ':entorno', 
        loadComponent: () => import('./pages/dashboard-cliente/dashboard-cliente.component').then(m => m.DashboardClienteComponent), 
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'inicio', pathMatch: 'full' },
            // Módulos Base
            { path: 'inicio', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/inicio/inicio.component').then(m => m.InicioComponent) },
            { 
                path: 'administracion', 
                loadComponent: () => import('./pages/dashboard-cliente/modulos/base/administracion/administracion/administracion').then(m => m.AdministracionComponent),
                children: [
                    { path: '', redirectTo: 'empresa', pathMatch: 'full' },
                    { path: 'empresa', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/administracion/admin-empresa/admin-empresa').then(m => m.AdminEmpresa) },
                    { path: 'usuarios', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/administracion/admin-usuarios/admin-usuarios').then(m => m.AdminUsuarios) },
                    { path: 'roles', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/administracion/admin-roles/admin-roles').then(m => m.AdminRoles) },
                    { path: 'estructura', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/administracion/admin-estructura/admin-estructura').then(m => m.AdminEstructura) },
                    { path: 'soporte', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/administracion/admin-soporte/admin-soporte').then(m => m.AdminSoporteComponent) },
                    { path: 'auditoria', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/administracion/admin-auditoria/admin-auditoria').then(m => m.AdminAuditoria) },
                    { path: 'contrato', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/administracion/administracion.component').then(m => m.AdministracionComponent) }
                ]
            },
            { path: 'gestion-de-tareas', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/gestion-de-tareas/gestion-de-tareas.component').then(m => m.GestionDeTareasComponent) },
            { path: 'formalizacion', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/formalizacion/formalizacion.component').then(m => m.FormalizacionComponent) },
            { path: 'gestiva-ia', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/gestiva-ia/gestiva-ia.component').then(m => m.GestivaIaComponent) },
            { path: 'autogestion', loadComponent: () => import('./pages/dashboard-cliente/modulos/base/autogestion/autogestion.component').then(m => m.AutogestionComponent) },
            
            // Módulos de Ventas
            { path: 'ventas', loadComponent: () => import('./pages/dashboard-cliente/modulos/ventas/ventas/ventas.component').then(m => m.VentasComponent) },
            { path: 'prefacturacion', loadComponent: () => import('./pages/dashboard-cliente/modulos/ventas/prefacturacion/prefacturacion.component').then(m => m.PrefacturacionComponent) },
            { path: 'inventario', loadComponent: () => import('./pages/dashboard-cliente/modulos/ventas/inventario/inventario.component').then(m => m.InventarioComponent) },
            { path: 'clientes', loadComponent: () => import('./pages/dashboard-cliente/modulos/ventas/clientes/clientes.component').then(m => m.ClientesComponent) },
            { path: 'compras', loadComponent: () => import('./pages/dashboard-cliente/modulos/ventas/compras/compras.component').then(m => m.ComprasComponent) },
            { path: 'proveedores', loadComponent: () => import('./pages/dashboard-cliente/modulos/ventas/proveedores/proveedores.component').then(m => m.ProveedoresComponent) },
            { path: 'caja', loadComponent: () => import('./pages/dashboard-cliente/modulos/ventas/caja/caja.component').then(m => m.CajaComponent) },
            
            // Módulos de Servicios
            { path: 'agenda', loadComponent: () => import('./pages/dashboard-cliente/modulos/servicios/agenda-y-calendario/agenda-y-calendario.component').then(m => m.AgendaYCalendarioComponent) },
            { path: 'gestion-de-clientes', loadComponent: () => import('./pages/dashboard-cliente/modulos/servicios/crm-gestion-de-clientes/crm-gestion-de-clientes.component').then(m => m.CrmGestionDeClientesComponent) },
            { path: 'servicios', loadComponent: () => import('./pages/dashboard-cliente/modulos/servicios/catalogo-de-servicios/catalogo-de-servicios.component').then(m => m.CatalogoDeServiciosComponent) },
            { path: 'gestion-de-operarios', loadComponent: () => import('./pages/dashboard-cliente/modulos/servicios/gestion-de-operarios/gestion-de-operarios.component').then(m => m.GestionDeOperariosComponent) },
            { path: 'reportes', loadComponent: () => import('./pages/dashboard-cliente/modulos/servicios/reportes-de-servicios/reportes-de-servicios.component').then(m => m.ReportesDeServiciosComponent) },
            
            // Módulos Transversales
            { path: 'gestion-humana', loadComponent: () => import('./pages/dashboard-cliente/modulos/transversales/gestion-humana/gestion-humana.component').then(m => m.GestionHumanaComponent) },
            { path: 'finanzas', loadComponent: () => import('./pages/dashboard-cliente/modulos/transversales/finanzas/finanzas.component').then(m => m.FinanzasComponent) },
            { path: 'addons', loadComponent: () => import('./pages/dashboard-cliente/modulos/transversales/addons/addons.component').then(m => m.AddonsComponent) },
            
            { path: ':modulo', loadComponent: () => import('./pages/shared/en-construccion/en-construccion').then(m => m.EnConstruccion) }
        ]
    },
    { path: '**', redirectTo: '' }
];
