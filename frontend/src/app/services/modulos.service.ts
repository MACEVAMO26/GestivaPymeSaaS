import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface Modulo {
  id: string;
  nombre: string;
  activo: boolean;
  asignado: boolean;
}

export interface PaquetesRespuesta {
  base?: Modulo[];
  ventas?: Modulo[];
  servicios?: Modulo[];
  finanzas?: Modulo[];
  rrhh?: Modulo[];
  addons?: Modulo[];
  [paqueteId: string]: Modulo[] | undefined;
}

export interface ModuloBaseUi {
  id: string;
  nombre: string;
  icono: string;
  ruta: string;
}

// Catálogo UI del producto: módulos base siempre visibles en el sidebar del cliente
// (No son datos de negocio: son estructura de navegación del aplicativo).
export const MODULOS_BASE_UI: ModuloBaseUi[] = [
  { id: 'd_ini', nombre: 'Inicio', icono: 'fas fa-home', ruta: 'inicio' },
  { id: 'd_adm', nombre: 'Administración', icono: 'fas fa-cog', ruta: 'administracion' },
  { id: 'd_tar', nombre: 'Gestión de Tareas', icono: 'fas fa-tasks', ruta: 'gestion-de-tareas' },
  { id: 'd_for', nombre: 'Formalización de usuarios', icono: 'fas fa-id-badge', ruta: 'formalizacion' },
  { id: 'd_gia', nombre: 'Gestiva IA', icono: 'fas fa-robot', ruta: 'gestiva-ia' },
  { id: 'd_aut', nombre: 'Autogestión', icono: 'fas fa-user-circle', ruta: 'autogestion' },
];

// Rutas del router para cada módulo de negocio (ventas/servicios). Los nombres en BD
// no siempre coinciden con la ruta (ej: "Agenda y Calendario" -> /agenda).
export const RUTA_MODULO: Record<string, string> = {
  v_pos: 'ventas', v_inv: 'inventario', v_cxc: 'clientes', v_rep: 'compras', v_prov: 'proveedores',
  s_age: 'agenda', s_crm: 'gestion-de-clientes', s_cat: 'servicios', s_ope: 'gestion-de-operarios', s_rep: 'reportes',
};

export const ICONO_MODULO: Record<string, string> = {
  v_pos: 'fas fa-store', v_inv: 'fas fa-boxes', v_cxc: 'fas fa-address-book',
  v_rep: 'fas fa-shopping-basket', v_prov: 'fas fa-truck',
  s_age: 'fas fa-calendar-check', s_crm: 'fas fa-handshake', s_cat: 'fas fa-list',
  s_ope: 'fas fa-user-cog', s_rep: 'fas fa-chart-line',
  rrhh: 'fas fa-users', finanzas: 'fas fa-wallet', addons: 'fas fa-plug'
};

@Injectable({
  providedIn: 'root'
})
export class ModulosService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  private getHeaders() { 
    const token = sessionStorage.getItem('auth_token'); 
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  getModulosPorEmpresa(empresaId: string | number): Observable<{ modulos: PaquetesRespuesta }> {
    return this.http.get<{ modulos: PaquetesRespuesta }>(`${this.apiUrl}/empresas/${empresaId}/modulos`, this.getHeaders());
  }

  getMisModulos(): Observable<{ modulos: PaquetesRespuesta }> {
    return this.http.get<{ modulos: PaquetesRespuesta }>(`${this.apiUrl}/mis-modulos`, this.getHeaders());
  }

  toggleModulo(empresaId: string | number, moduloId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/empresas/${empresaId}/modulos/${moduloId}/toggle`, {}, this.getHeaders());
  }

  updatePaqueteEmpresa(empresaId: string | number, modulosState: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/empresas/${empresaId}/modulos/paquete`, { modulos: modulosState }, this.getHeaders());
  }

  // Catálogo UI del producto para la gestión global de módulos del SAAS admin.
  // Los estados activo/asignado SIEMPRE provienen de la BD (actualizarUIModulos).
  getCatalogoModulos(): Observable<any[]> {
    return of(CATALOGO_MODULOS_UI);
  }

  // CRUD Global de Módulos (Catálogo)
  crearModuloGlobal(id: string, nombre: string, paquete: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/modulos`, { id, nombre, paquete }, this.getHeaders());
  }

  editarModuloGlobal(id: string, nombre: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/modulos/${id}`, { nombre }, this.getHeaders());
  }

  eliminarModuloGlobal(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/modulos/${id}`, this.getHeaders());
  }
}

// Estructura de paquetes del producto (solo UI: nombres, iconos). Sin datos de negocio.
const CATALOGO_MODULOS_UI: any[] = [
  {
    id: 'ventas',
    nombre: 'Paquete VENTAS',
    descripcion: 'Para comercios y tiendas de productos físicos.',
    icono: 'fas fa-shopping-cart',
    color: 'blue',
    modulos: [
      { id: 'v_pos', nombre: 'Ventas', icono: 'fas fa-store' },
      { id: 'v_inv', nombre: 'Inventario', icono: 'fas fa-boxes' },
      { id: 'v_cxc', nombre: 'Clientes', icono: 'fas fa-address-book' },
      { id: 'v_rep', nombre: 'Compras', icono: 'fas fa-shopping-basket' },
      { id: 'v_prov', nombre: 'Proveedores', icono: 'fas fa-truck' },
    ],
  },
  {
    id: 'servicios',
    nombre: 'Paquete SERVICIOS',
    descripcion: 'Para agendas, barberías, consultorios y talleres.',
    icono: 'fas fa-calendar-alt',
    color: 'purple',
    modulos: [
      { id: 's_age', nombre: 'Agenda', icono: 'fas fa-calendar-check' },
      { id: 's_crm', nombre: 'Gestión de Clientes', icono: 'fas fa-handshake' },
      { id: 's_cat', nombre: 'Servicios', icono: 'fas fa-list' },
      { id: 's_ope', nombre: 'Gestión de Operarios', icono: 'fas fa-user-cog' },
      { id: 's_rep', nombre: 'Reportes', icono: 'fas fa-chart-line' },
    ],
  },
  {
    id: 'finanzas',
    nombre: 'FINANZAS',
    descripcion: 'Registro de pagos y cobro por servicios o productos.',
    icono: 'fas fa-cash-register',
    color: 'yellow',
    modulos: [{ id: 'f_caja', nombre: 'Caja y Pre-facturación', icono: 'fas fa-cash-register' }],
  },
  {
    id: 'rrhh',
    nombre: 'GESTIÓN HUMANA',
    descripcion: 'Gestión de empleados, turnos y vacaciones. Disponible para todos.',
    icono: 'fas fa-users',
    color: 'indigo',
    modulos: [
      { id: 'r_tur', nombre: 'Horarios y Turnos', icono: 'fas fa-clock' },
      { id: 'r_aus', nombre: 'Horas Extras y Ausencias', icono: 'fas fa-user-clock' },
      { id: 'r_vac', nombre: 'Gestión de Vacaciones', icono: 'fas fa-umbrella-beach' }
    ],
  },
  {
    id: 'addons',
    nombre: 'Addons+',
    descripcion: 'Conectores y herramientas extra que se cobran por separado.',
    icono: 'fas fa-plug',
    color: 'green',
    modulos: [
      { id: 'a_contable', nombre: 'Conector Contable', icono: 'fas fa-file-invoice-dollar' },
    ],
  },
];
