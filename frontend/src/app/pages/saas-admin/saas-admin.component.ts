import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { DashboardSaasComponent } from '../dashboard-saas/dashboard-saas.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import {
  AccessibilityService,
  DaltonismMode,
} from '../../services/accessibility/accessibility.service';
import { EmpresaService } from '../../services/empresa.service';
import { TarifaService } from '../../services/tarifa.service';
import { ToastService } from '../../services/toast.service';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ModulosService } from '../../services/modulos.service';

export interface SuscripcionEmpresa {
  id: number;
  empresaId: number;
  nombreEmpresa: string;
  fechaInscripcion: string;
  plan: string;
  tipoEmpresa?: string;
  modulosExtra: number;
  addonsList: any[];
  descuentosAplicados: any[];
  paquetesAdicionales: string;
  descuentos: string;
  cargosExtra: any[];
  proximoPagoTotal?: number;
  fechaProximoPago: any;
  estado: string;
  renovaciones: number;
  cartItems?: any[];
  iaByokActivo?: boolean;
  iaByokProveedor?: string;
  iaByokModelo?: string;
  iaByokKeyExists?: boolean;
}

@Component({
  selector: 'app-saas-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardSaasComponent],
  templateUrl: './saas-admin.component.html',
  styleUrls: ['./saas-admin.component.scss'],
})
export class SaasAdminComponent implements OnInit {
  // --- VARIABLES DE ESTADO ---
  user: any = null;
  isAccessibilityMenuOpen = false;
  empresas: any[] = [];
  isLoadingEmpresas: boolean = true;

  // --- VARIABLES PARA EL CONTROL DE IA ---
  iaConfigSeleccionada = {
    empresaId: null as number | null,
    fuente: 'gestivapyme' as 'gestivapyme' | 'propia',
    proveedor: 'gemini',
    apiKey: '',
    tieneLlave: false,
    modo: 'apagado',
    tareas: {
      resumir: false,
      redactar: false,
      analizar: false,
      automatizar: false
    }
  };
  
  // --- VARIABLES PARA CONTRATOS SAAS ---
  contratosHistory: any[] = [];
  nuevoContrato = {
    version: '1.0',
    contenido: '<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS SAAS</h1><p>Entre los suscritos a saber: de una parte GESTIVAPYME...</p>'
  };
  isGuardandoContrato = false;

  empresasEnMora: number = 0;
  empresaDestacadaId: number | null = null;
  camposAprobados: { [key: string]: boolean } = {};
  showModal = false;
  showSuccessModal = false;
  showAddonModal = false;
  nombreNuevoAddon = '';
  editingAddonId: string | null = null;
  createdAdminEmail = '';
  createdAdminPassword = '';
  
  isEditMode = false;
  editingId: number | null = null;
  isSubmitting: boolean = false;
  opcionesDominio: string[] = [];
  dominioIndex: number = 0;
  lastRazonSocialGenerada: string = '';
  nuevaEmpresa: any = {
    razon_social: '',
    dominio: '',
    nit: '',
    email: '',
    plan_suscripcion: 'Emprendedor',
    tipo_empresa: 'Ventas',
    tipo_identificacion: 'NIT',
    fecha_inscripcion: new Date().toLocaleDateString('en-CA'),
    color_primario: '#6366f1',
    color_secundario: '#1e293b',
    color_fondo: '#4c808a',
    color_texto: '#f8fafc',
    primer_nombre_gerente: '',
    segundo_nombre_gerente: '',
    primer_apellido_gerente: '',
    segundo_apellido_gerente: '',
    tipo_documento_gerente: 'CC',
    documento_gerente: ''
  };
  listaDescuentosEmpresa: string[] = [];
  currentView = 'dashboard';

  // --- VARIABLES DE PERFIL (SEGURIDAD) ---
  userInitials = 'U';
  userName = '';
  userEmail = '';
  userAvatar: string | null = null;
  profileForm = {
    nombres: '',
    email: ''
  };
  isUpdatingProfile = false;


  // --- VARIABLES PARA GESTIÓN DE SUSCRIPCIÓN (CARRITO) ---
  editandoSuscripcion = false;
  catalogoTarifas: any[] = [];
  cartItemsSelect: { [key: string]: { active: boolean, cantidad: number } } = {};
  selectedTipoEmpresa: string = 'Ventas';
  iaByokActivo: boolean = false;
  iaByokProveedor: string = 'gemini';
  iaByokModelo: string = 'gemini-3.5-flash-lite';
  iaByokKey: string = '';
  iaByokKeyExists: boolean = false;
  activeTabCarrito: string = 'plan_base';

  showGestionSuscripcionModal = false;
  suscripcionEnEdicion: SuscripcionEmpresa | null = null;

  filtroEmpresaSolicitud: string = '';
  filtroFechaSolicitud: string = '';

  // --- SISTEMA DE PAGINACIÓN UNIFICADO (8 ENTRADAS POR PÁGINA) ---
  pageSize: number = 8;
  pageEmpresas: number = 1;
  pageSuscripciones: number = 1;
  pageLeads: number = 1;
  pageTickets: number = 1;
  pageSolicitudes: number = 1;
  Math = Math;

  busquedaEmpresas: string = '';
  // Bloque getter para filtrar la lista de empresas según el término de búsqueda


  get empresasFiltradas(): any[] {
    if (!this.busquedaEmpresas || !this.busquedaEmpresas.trim()) {
      return this.empresas;
    }
    const term = this.busquedaEmpresas.trim().toLowerCase();
    return this.empresas.filter(e => {
      const razonSocial = (e.razon_social || '').toLowerCase();
      const nit = (e.nit || '').toLowerCase();
      const dominio = (e.dominio || '').toLowerCase();
      const email = (e.email || '').toLowerCase();
      const plan = (e.plan_suscripcion || '').toLowerCase();
      const tipoEmpresa = (e.tipo_empresa || '').toLowerCase();
      const estadoPago = (e.estado_pago || '').toLowerCase();
      return razonSocial.includes(term) ||
             nit.includes(term) ||
             dominio.includes(term) ||
             email.includes(term) ||
             plan.includes(term) ||
             tipoEmpresa.includes(term) ||
             estadoPago.includes(term);
    });
  }
  // Bloque para reiniciar la paginación al cambiar el término de búsqueda de empresas


  onBusquedaEmpresasChange() {
    this.pageEmpresas = 1;
  }
  // Bloque para limpiar el término de búsqueda y restablecer la paginación de empresas


  limpiarBusquedaEmpresas() {
    this.busquedaEmpresas = '';
    this.pageEmpresas = 1;
  }
  // Bloque getter para obtener el segmento paginado de la lista de empresas


  get paginatedEmpresas(): any[] {
    const filtradas = this.empresasFiltradas;
    const start = (this.pageEmpresas - 1) * this.pageSize;
    return filtradas.slice(start, start + this.pageSize);
  }
  // Bloque getter para calcular el número total de páginas de empresas

  get totalPagesEmpresas(): number {
    return Math.ceil(this.empresasFiltradas.length / this.pageSize) || 1;
  }
  // Bloque getter para obtener el segmento paginado de suscripciones


  get paginatedSuscripciones(): any[] {
    const start = (this.pageSuscripciones - 1) * this.pageSize;
    return this.suscripcionesList.slice(start, start + this.pageSize);
  }
  // Bloque getter para calcular el número total de páginas de suscripciones

  get totalPagesSuscripciones(): number {
    return Math.ceil(this.suscripcionesList.length / this.pageSize) || 1;
  }
  // Bloque getter para obtener el segmento paginado de clientes potenciales


  get paginatedLeads(): any[] {
    const start = (this.pageLeads - 1) * this.pageSize;
    return this.leads.slice(start, start + this.pageSize);
  }
  // Bloque getter para calcular el número total de páginas de clientes potenciales

  get totalPagesLeads(): number {
    return Math.ceil(this.leads.length / this.pageSize) || 1;
  }
  // Bloque getter para extraer los tipos de soporte únicos disponibles
  get tiposSoporteDisponibles(): string[] {
    const tipos = new Set<string>();
    for (const t of this.ticketsSoporte) {
      if (t.tipo) tipos.add(t.tipo);
    }
    return Array.from(tipos);
  }

  // Bloque getter para filtrar la lista de tickets de soporte
  get ticketsSoporteFiltrados(): any[] {
    return this.ticketsSoporte.filter((ticket: any) => {
      // Filtro por empresa (nombre, razón social o NIT)
      if (this.filtroEmpresaTicket.trim()) {
        const query = this.filtroEmpresaTicket.toLowerCase().trim();
        const razon = (ticket.empresa?.razon_social || '').toLowerCase();
        const nit = (ticket.empresa?.nit || '').toLowerCase();
        if (!razon.includes(query) && !nit.includes(query)) {
          return false;
        }
      }

      // Filtro por tipo de soporte
      if (this.filtroTipoTicket) {
        const tipoTicket = (ticket.tipo || '').toLowerCase();
        if (tipoTicket !== this.filtroTipoTicket.toLowerCase()) {
          return false;
        }
      }

      // Filtro por estado
      if (this.filtroEstadoTicket) {
        if ((ticket.estado || '').toLowerCase() !== this.filtroEstadoTicket.toLowerCase()) {
          return false;
        }
      }

      // Filtro por fecha (YYYY-MM-DD)
      if (this.filtroFechaTicket) {
        const fechaTicket = (ticket.created_at || '').substring(0, 10);
        if (fechaTicket !== this.filtroFechaTicket) {
          return false;
        }
      }

      return true;
    });
  }

  // Bloque getter para obtener el segmento paginado de tickets de soporte
  get paginatedTickets(): any[] {
    const start = (this.pageTickets - 1) * this.pageSize;
    return this.ticketsSoporteFiltrados.slice(start, start + this.pageSize);
  }

  // Bloque getter para calcular el número total de páginas de tickets de soporte
  get totalPagesTickets(): number {
    return Math.ceil(this.ticketsSoporteFiltrados.length / this.pageSize) || 1;
  }
  // Bloque getter para obtener el segmento paginado de solicitudes administrativas


  get paginatedSolicitudes(): any[] {
    const start = (this.pageSolicitudes - 1) * this.pageSize;
    return this.solicitudesFiltradas.slice(start, start + this.pageSize);
  }
  // Bloque getter para calcular el número total de páginas de solicitudes administrativas

  get totalPagesSolicitudes(): number {
    return Math.ceil(this.solicitudesFiltradas.length / this.pageSize) || 1;
  }
  // Bloque getter para filtrar solicitudes administrativas por empresa y fecha


  get solicitudesFiltradas() {
    return this.solicitudes.filter(s => {
      const empresaStr = s.empresa?.razon_social || '';
      const matchEmpresa = empresaStr.toLowerCase().includes(this.filtroEmpresaSolicitud.toLowerCase());
      const matchFecha = this.filtroFechaSolicitud ? (s.created_at || '').includes(this.filtroFechaSolicitud) : true;
      return matchEmpresa && matchFecha;
    });
  }
  // Bloque para obtener los encabezados de autorización HTTP para peticiones al backend


  getHeaders() {
    return { 
      'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`,
      'Accept': 'application/json'
    };
  }



  // --- MÉTODOS DEL CARRITO DE SUSCRIPCIÓN ---
  // Bloque para consultar el catálogo de tarifas y paquetes disponibles desde el backend

  cargarCatalogoTarifas() {
    this.tarifaService.getCatalogo().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.catalogoTarifas = res;
      },
      error: (err) => {
        console.error('Error al cargar catálogo de tarifas', err);
      }
    });
  }

  // Bloque para inicializar y abrir el carrito de suscripción para una empresa seleccionada
  abrirCarritoSuscripcion(suscripcion: SuscripcionEmpresa) {
    this.suscripcionEnEdicion = suscripcion;
    this.selectedTipoEmpresa = suscripcion.tipoEmpresa || 'Ventas';
    this.iaByokActivo = suscripcion.iaByokActivo || false;
    this.iaByokProveedor = suscripcion.iaByokProveedor || 'gemini';
    this.iaByokModelo = suscripcion.iaByokModelo || 'gemini-3.5-flash-lite';
    this.iaByokKey = '';
    this.iaByokKeyExists = suscripcion.iaByokKeyExists || false;
    this.activeTabCarrito = 'plan_base';
    
    // Bloque para inicializar la selección del catálogo
    this.cartItemsSelect = {};
    for (let item of this.catalogoTarifas) {
      const activeItem = (suscripcion.cartItems || []).find((c: any) => c.id === item.id);
      this.cartItemsSelect[item.id] = {
        active: !!activeItem,
        cantidad: activeItem ? activeItem.cantidad : 1
      };
    }

    // Bloque de auto-selección del plan contratado en el carrito de compras
    
    const hayPlanActivo = this.catalogoTarifas.some(
      (i: any) => i.tipo === 'plan' && this.cartItemsSelect[i.id]?.active
    );
    if (!hayPlanActivo) {
      const planEmpresa = (suscripcion.plan || '').replace('Plan ', '').trim().toLowerCase();
      const tarifaPlan = this.catalogoTarifas.find(
        (i: any) => i.tipo === 'plan' && i.nombre.replace('Plan ', '').trim().toLowerCase() === planEmpresa
      );
      if (tarifaPlan) {
        this.cartItemsSelect[tarifaPlan.id] = { active: true, cantidad: 1 };
      }
    }
    
    this.editandoSuscripcion = true;
  }
  // Bloque para cerrar la vista del configurador de suscripción y volver al listado


  cerrarCarritoSuscripcion() {
    this.suscripcionEnEdicion = null;
    this.editandoSuscripcion = false;
  }

  
  
    auditarEmpresa(empresa: any) {
    if (confirm("Desea ingresar al dashboard como Auditor de la empresa " + empresa.razon_social + "?")) {
      this.http.post<any>("/api/empresas/" + empresa.id + "/impersonate-auditor", {}, { headers: this.getHeaders() })
        .subscribe({
          next: (res) => {
            sessionStorage.setItem("auth_token", res.token);
            sessionStorage.setItem("current_user", JSON.stringify(res.user));
            sessionStorage.setItem("modulos_activos", JSON.stringify(res.modulos_activos || {}));
            this.toastService.success("Entrando como Auditor...");
            
            let rutaAuditor = '/inicio';
            if (res.user && res.user.empresa) {
                if (res.user.empresa.dominio) {
                    rutaAuditor = '/' + res.user.empresa.dominio + '/inicio';
                } else if (res.user.empresa.razon_social) {
                    const slug = res.user.empresa.razon_social.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                    rutaAuditor = '/' + slug + '/inicio';
                }
            }
            window.location.href = rutaAuditor;

          },
          error: (err) => {
            this.toastService.error("Error al generar sesion de auditor: " + (err.error?.error || err.message));
          }
        });
    }
  }
  // Bloque para navegar desde la tabla de empresas y abrir el carrito con el plan contratado


  abrirSuscripcionDeEmpresa(empresa: any) {
    const sus = this.suscripcionesList.find((s: any) => s.empresaId === empresa.id);
    if (!sus) {
      this.toastService.warning('No se encontró la suscripción de la empresa. Revisa la pestaña Suscripciones.');
      return;
    }
    this.currentView = 'suscripciones';
    localStorage.setItem('saas_current_view', 'suscripciones');
    this.abrirCarritoSuscripcion(sus);
  }
  // Bloque getter para calcular el subtotal monetario de los ítems en el carrito de compras


  get subtotalSuscripcion(): number {
    let sub = 0;
    for (let item of this.catalogoTarifas) {
      if (item.tipo === 'descuento') continue;
      const cartItem = this.cartItemsSelect[item.id];
      if (cartItem && cartItem.active) {
        if (item.mecanismo === 'fijo') {
          sub += Number(item.valor);
        } else if (item.mecanismo === 'por_usuario') {
          sub += Number(item.valor) * cartItem.cantidad;
        }
      }
    }
    return sub;
  }

  // Bloque getter para calcular el porcentaje total de descuentos aplicados a la empresa

  get descuentoEmpresaPct(): number {
    if (!this.suscripcionEnEdicion?.descuentos || this.suscripcionEnEdicion.descuentos === 'Ninguno') return 0;
    let pct = 0;
    for (const d of this.suscripcionEnEdicion.descuentos.split(',')) {
      const t = d.trim().toLowerCase();
      if (t.includes('referido')) pct += 10;
      else if (t.includes('mes gratis')) pct += 8.33;
    }
    return pct;
  }
  // Bloque getter para calcular el valor monetario del descuento sobre la suscripción


  get descuentoSuscripcion(): number {
    return this.subtotalSuscripcion * (this.descuentoEmpresaPct / 100);
  }
  // Bloque getter para calcular el gran total mensual recurrente a pagar


  get totalSuscripcion(): number {
    return Math.max(0, this.subtotalSuscripcion - this.descuentoSuscripcion);
  }

  guardandoSuscripcion = false;
  // Bloque para guardar y sincronizar la suscripción y módulos de la empresa en el backend


  guardarCarritoSuscripcion() {
    if (!this.suscripcionEnEdicion) return;

    // Bloque de validación de negocio para módulos especiales y paquete base
    const hasBasePackage = ['Ventas', 'Servicios', 'Ventas y Servicios'].includes(this.selectedTipoEmpresa);
    
    const itemsPayload = [];
    for (let item of this.catalogoTarifas) {
      const cartItem = this.cartItemsSelect[item.id];
      
      // Bloque para auto-seleccionar el addon de BYOK si está activo
      if (item.id === 'addon_byok_ia') {
        cartItem.active = this.iaByokActivo;
      }
      
      // Bloque para desactivar cobro de IA SaaS si el cliente usa su propia API
      if (this.iaByokActivo && (item.id === 'ia_simple' || item.id === 'ia_avanzada')) {
        cartItem.active = false;
      }

      if (cartItem && cartItem.active) {
        if (item.tipo === 'modulo_adicional' && !hasBasePackage) {
          this.toastService.error('Debe seleccionar un paquete base (Ventas, Servicios o Mixto) antes de agregar módulos adicionales.');
          return;
        }
        itemsPayload.push({
          id: item.id,
          cantidad: cartItem.cantidad
        });
      }
    }

    const hasPlanSelected = itemsPayload.some(payloadItem => {
      const catItem = this.catalogoTarifas.find(c => c.id === payloadItem.id);
      return catItem && catItem.tipo === 'plan';
    });

    if (!hasPlanSelected) {
      this.toastService.error('Debe seleccionar un Plan de Suscripción (Ej: Plan Emprendedor, Pyme o Empresarial) para poder continuar.');
      return;
    }

    const payload = {
      tipo_empresa: this.selectedTipoEmpresa,
      items: itemsPayload,
      ia_byok_activo: this.iaByokActivo,
      ia_byok_proveedor: this.iaByokProveedor,
      ia_byok_key: this.iaByokKey,
      ia_byok_modelo: this.iaByokModelo
    };

    this.guardandoSuscripcion = true;
    const id = this.suscripcionEnEdicion.empresaId || this.suscripcionEnEdicion.id;
    this.empresaService.updateTarifas(id, payload).subscribe({
      next: () => {
        this.toastService.success('Suscripción y tarifas de la empresa actualizadas exitosamente.');
        this.guardandoSuscripcion = false;
        this.cargarSuscripciones();
        this.cerrarCarritoSuscripcion();
      },
      error: (err) => {
        this.guardandoSuscripcion = false;
        const errMsg = err?.error?.error || 'Error al guardar la suscripción de la empresa.';
        this.toastService.error(errMsg);
        console.error(err);
      }
    });
  }

  solicitudes: any[] = [];
  solicitudesPendientes: number = 0;
  ticketsSoporte: any[] = [];
  ticketsSoportePendientes: number = 0;
  paquetesModulos: any[] = [];
  paquetesExpandidos: { [key: string]: boolean } = {};
  guardandoPaqueteId: string | null = null;
  statsSuscripciones = {
    mrr: 0,
    clientesActivos: 0,
    clientesMora: 0,
    crecimientoMensual: 0,
  };
  suscripcionesList: any[] = [];
  serverStatus: any = {
    status: 'online',
    generalUptime: '—',
    dbConnection: '—',
    lastBackup: '—',
    lastActivity: 'Desconocida',
  };
  empresaSeleccionadaId: string | null = null;
  comercialTab: 'interesados' | 'correos' = 'interesados';
  leads: any[] = [];
  showNotasModal = false;
  leadSeleccionadoParaNotas: any = null;
  nuevaNotaTexto = '';
  asuntoBrevo: string = '';
  mensajeBrevo: string = '';
  isEnviandoBrevo: boolean = false;
  archivoAdjuntoBrevo: File | null = null;
  debugError: string | null = null;
  isSidebarCollapsed = false;
  isModalSolicitudOpen = false;
  solicitudSeleccionada: any = null;
  mensajeRespuesta: string = '';
  archivoMigracionCorregido: File | null = null;
  importandoMigracion = false;

  // --- VARIABLES DE TICKETS DE SOPORTE Y FILTROS ---
  isModalTicketOpen = false;
  ticketSeleccionado: any = null;
  respuestaTicket: string = '';
  isRespondiendoTicket = false;
  filtroEmpresaTicket: string = '';
  filtroFechaTicket: string = '';
  filtroTipoTicket: string = '';
  filtroEstadoTicket: string = '';
  estadoNuevoTicket: string = 'Resuelto';

  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  public accessibilityService = inject(AccessibilityService);
  public toastService = inject(ToastService);
  private empresaService = inject(EmpresaService);
  private tarifaService = inject(TarifaService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private modulosService: ModulosService,
  ) {}

  @HostListener('window:pageshow')
  // Bloque de verificación de autenticación al mostrarse la página en el navegador

  onPageShow(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
  // Bloque del ciclo de vida ngOnInit para inicializar datos de usuario, vistas y suscripciones


  ngOnInit(): void {
    this.user = this.authService.getUser();
    
    // Bloque para inicializar los datos del perfil de usuario
    if (this.user) {
      this.userName = this.user.nombres || 'Usuario';
      this.userEmail = this.user.email || '';
      this.userInitials = this.userName.substring(0, 2).toUpperCase();
      this.userAvatar = this.user.avatar_url || null;
      this.profileForm.nombres = this.userName;
      this.profileForm.email = this.userEmail;
    }

    if (this.user && this.user.empresa_id !== null) {
      let ruta = '/inicio';
      if (this.user.empresa) {
        if (this.user.empresa.dominio) {
          ruta = '/' + this.user.empresa.dominio + '/inicio';
        } else if (this.user.empresa.razon_social) {
          const slug = this.user.empresa.razon_social.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
          ruta = '/' + slug + '/inicio';
        }
      }
      this.router.navigate([ruta], { replaceUrl: true });
      return;
    }

    if (typeof window !== 'undefined') {
      if (window.innerWidth <= 768) {
        this.isSidebarCollapsed = true;
      }
      this.cargarEmpresas();
      this.cargarSolicitudes();
      this.cargarTicketsSoporte();
      this.cargarSuscripciones();
    }

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const vista = params.get('vista');
      if (vista) {
        this.currentView = vista;
        localStorage.setItem('saas_current_view', vista);
      } else {
        const savedView = localStorage.getItem('saas_current_view');
        if (savedView) {
          this.currentView = savedView;
        }
      }
      this.cargarDatosPorVista(this.currentView);
    });

    // Bloque de verificación heartbeat para detectar cierre de sesión remoto
    if (typeof window !== 'undefined') {
      const sessionInterval = setInterval(() => {
        if (this.authService.getToken()) {
          this.authService.checkSession().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            error: () => {}
          });
        } else {
          clearInterval(sessionInterval);
        }
      }, 25000);

      this.destroyRef.onDestroy(() => clearInterval(sessionInterval));
    }
  }

  private cargarDatosPorVista(vista: string): void {
    if (vista === 'empresas' || vista === 'suscripciones') {
      if (this.catalogoTarifas.length === 0) {
        this.cargarCatalogoTarifas();
      }
    } else if (vista === 'paquetes') {
      if (this.paquetesModulos.length === 0) {
        this.modulosService.getCatalogoModulos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(catalog => {
          this.paquetesModulos = JSON.parse(JSON.stringify(catalog)).filter((p: any) => p.id !== 'default');
        });
      }
      this.cargarSystemStats();
    } else if (vista === 'comercial') {
      this.cargarLeads();
    } else if (vista === 'control-ia') {
      this.cargarConfiguracionIA();
    } else if (vista === 'contratos') {
      this.cargarContratos();
    }
  }

  // Bloque para abrir el modal de notas y seguimiento del cliente potencial

  abrirModalNotas(lead: any) {
    this.leadSeleccionadoParaNotas = lead;
    if (!this.leadSeleccionadoParaNotas.notas) {
      this.leadSeleccionadoParaNotas.notas = [];
    }
    // Bloque para filtrar notas con más de 90 días de antigüedad
    const tresMesesAtras = new Date();
    tresMesesAtras.setDate(tresMesesAtras.getDate() - 90);
    this.leadSeleccionadoParaNotas.notas = this.leadSeleccionadoParaNotas.notas.filter((n: any) => new Date(n.fecha) > tresMesesAtras);
    
    this.showNotasModal = true;
  }
  // Bloque para cerrar el modal de notas del cliente potencial


  cerrarModalNotas() {
    this.showNotasModal = false;
    this.leadSeleccionadoParaNotas = null;
    this.nuevaNotaTexto = '';
  }
  // Bloque para añadir una nueva nota al historial del cliente potencial


  agregarNota() {
    if (!this.nuevaNotaTexto.trim()) return;
    
    const nuevaNota = {
      id: Date.now().toString(),
      texto: this.nuevaNotaTexto,
      fecha: new Date().toISOString()
    };

    this.leadSeleccionadoParaNotas.notas.unshift(nuevaNota);
    this.nuevaNotaTexto = '';
    this.guardarNotasEnBackend();
  }

  // Bloque para eliminar una nota del historial del cliente potencial
  eliminarNota(notaId: string) {
    this.leadSeleccionadoParaNotas.notas = this.leadSeleccionadoParaNotas.notas.filter((n: any) => n.id !== notaId);
    this.guardarNotasEnBackend();
  }

  // Bloque para sincronizar las notas del cliente potencial con la base de datos
  guardarNotasEnBackend() {
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http
      .patch(`/api/leads/${this.leadSeleccionadoParaNotas.id}`, { notas: this.leadSeleccionadoParaNotas.notas }, { headers })
      .subscribe({
        next: () => {},
        error: () => this.toastService.error('Error al guardar la nota.')
      });
  }
  // Bloque para alternar el estado colapsado o expandido de la barra lateral


  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
  // Bloque para cambiar la vista activa del panel de administración SaaS


  cambiarVista(vista: string) {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.isSidebarCollapsed = true;
    }
    this.router.navigate(['/saas-admin', vista], { replaceUrl: true });
  }

  // --- MÉTODOS PARA CONTRATOS SAAS ---
  // Bloque para consultar el historial de versiones del contrato SaaS

  cargarContratos() {
    this.http.get('/api/saas/contratos', { headers: this.getHeaders() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        this.contratosHistory = res;
      },
      error: (err) => console.error('Error cargando contratos', err)
    });
  }
  // Bloque para registrar y publicar una nueva versión del contrato SaaS


  guardarNuevoContrato() {
    if (!this.nuevoContrato.contenido || !this.nuevoContrato.version) {
      this.toastService.warning('La versión y el contenido son obligatorios');
      return;
    }

    this.isGuardandoContrato = true;
    this.http.post('/api/saas/contratos', this.nuevoContrato, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.toastService.success(res.message || 'Contrato publicado y gerentes notificados.');
        this.isGuardandoContrato = false;
        this.nuevoContrato.version = '';
        this.nuevoContrato.contenido = '';
        this.cargarContratos();
      },
      error: (err) => {
        console.error(err);
        this.toastService.error('Error al publicar el contrato.');
        this.isGuardandoContrato = false;
      }
    });
  }

  // --- MÉTODOS PARA CONTROL DE IA ---
  // Bloque para gestionar el cambio de empresa seleccionada en el panel de IA
  onEmpresaIAChange(id: any) {
    this.iaConfigSeleccionada.empresaId = id ? +id : null;
    this.cargarConfiguracionIA();
  }

  // Bloque para cargar la configuración de inteligencia artificial de la empresa seleccionada
  cargarConfiguracionIA() {
    if (!this.iaConfigSeleccionada.empresaId) {
      this.iaConfigSeleccionada.fuente     = 'gestivapyme';
      this.iaConfigSeleccionada.proveedor  = 'gemini';
      this.iaConfigSeleccionada.apiKey     = '';
      this.iaConfigSeleccionada.tieneLlave = false;
      this.iaConfigSeleccionada.modo       = 'apagado';
      this.iaConfigSeleccionada.tareas     = { resumir: false, redactar: false, analizar: false, automatizar: false };
      return;
    }
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    const params = `?empresa_id=${this.iaConfigSeleccionada.empresaId}`;
    this.http.get(`/api/saas/ia-config${params}`, { headers }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (data) {
          this.iaConfigSeleccionada.fuente     = data.fuente      || 'gestivapyme';
          this.iaConfigSeleccionada.proveedor  = data.proveedor   || 'gemini';
          this.iaConfigSeleccionada.modo       = data.modo        || 'apagado';
          this.iaConfigSeleccionada.apiKey     = data.api_key     || '';
          this.iaConfigSeleccionada.tieneLlave = data.tiene_llave || false;
          this.iaConfigSeleccionada.tareas     = data.tareas      || { resumir: false, redactar: false, analizar: false, automatizar: false };
        } else {
          this.iaConfigSeleccionada.fuente     = 'gestivapyme';
          this.iaConfigSeleccionada.apiKey     = '';
          this.iaConfigSeleccionada.tieneLlave = false;
          this.iaConfigSeleccionada.modo       = 'apagado';
          this.iaConfigSeleccionada.tareas     = { resumir: false, redactar: false, analizar: false, automatizar: false };
        }
      },
      error: (err) => {
        console.error('Error cargando configuración de IA', err);
        this.toastService.error('No se pudo cargar la configuración de IA. Verifica tu sesión.');
      }
    });
  }
  // Bloque para guardar y aplicar la configuración de inteligencia artificial en la base de datos


  guardarConfiguracionIA() {
    if (!this.iaConfigSeleccionada.empresaId) {
      this.toastService.error('Por favor, selecciona una empresa primero.');
      return;
    }
    if (
      this.iaConfigSeleccionada.fuente === 'propia' &&
      this.iaConfigSeleccionada.modo !== 'apagado' &&
      !this.iaConfigSeleccionada.apiKey &&
      !this.iaConfigSeleccionada.tieneLlave
    ) {
      this.toastService.error('Debes ingresar una API Key para habilitar la IA propia.');
      return;
    }

    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    const mantenerLlave = this.iaConfigSeleccionada.apiKey.startsWith('********');

    const payload: any = {
      empresa_id:     this.iaConfigSeleccionada.empresaId,
      fuente:         this.iaConfigSeleccionada.fuente,
      proveedor:      this.iaConfigSeleccionada.proveedor,
      modo:           this.iaConfigSeleccionada.modo,
      tareas:         this.iaConfigSeleccionada.tareas,
      mantener_llave: mantenerLlave
    };

    if (!mantenerLlave && this.iaConfigSeleccionada.fuente === 'propia') {
      payload.api_key = this.iaConfigSeleccionada.apiKey;
    }

    this.http.post('/api/saas/ia-config', payload, { headers }).subscribe({
      next: (res: any) => {
        this.toastService.success(res.message || 'Configuración de IA guardada con éxito.');
        this.cargarConfiguracionIA();
      },
      error: (err) => {
        console.error('Error guardando IA', err);
        this.toastService.error('Error al guardar la configuración de IA. Verifica la conexión.');
      }
    });
  }

  // Bloque para alternar entre las subpestañas del módulo comercial de leads
  setComercialTab(tab: 'interesados' | 'correos') {
    this.comercialTab = tab;
  }
  // Bloque para consultar el listado de prospectos y leads comerciales registrados



  cargarLeads() {
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      this.debugError = 'NO HAY TOKEN DE SESIÓN EN LOCALSTORAGE.';
      this.cdr.detectChanges();
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const t = new Date().getTime();
    this.http.get<any[]>(`/api/leads?t=${t}`, { headers }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.leads = [...data];
        if (this.leads.length === 0) {
          this.debugError = 'Backend devolvió 0 leads. Data real: ' + JSON.stringify(data);
        } else {
          this.debugError = 'Exito: ' + this.leads.length + ' leads cargados.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.debugError = 'Error cargando leads: ' + err.message;
        this.cdr.detectChanges();
      },
    });
  }
  // Bloque para capturar el archivo adjunto para campañas masivas de correo


  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoAdjuntoBrevo = file;
    }
  }

  // --- MÉTODOS DE PERFIL Y SEGURIDAD ---
  // Bloque para actualizar los datos personales y correo del administrador del SaaS

  actualizarPerfil() {
    this.isUpdatingProfile = true;
    this.http.put('/api/profile', this.profileForm, { headers: this.getHeaders() }).subscribe({
        next: (res: any) => {
          this.userName = res.user.nombres;
          this.userEmail = res.user.email;
          this.userInitials = this.userName.substring(0, 2).toUpperCase();
          
          // Bloque para actualizar datos en sessionStorage
          const currentUser = this.authService.getUser();
          if (currentUser) {
            currentUser.nombres = this.userName;
            currentUser.email = this.userEmail;
            sessionStorage.setItem('current_user', JSON.stringify(currentUser));
          }

          this.toastService.success('Perfil actualizado correctamente');
          this.isUpdatingProfile = false;
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Error al actualizar el perfil.');
          this.isUpdatingProfile = false;
        }
      });
  }
  // Bloque para ejecutar el cambio obligatorio de contraseña del administrador


  forzarCambioClave() {
    this.confirmModalTitle = 'Forzar Cambio de Clave';
    this.confirmModalMessage = 'Al aceptar, tu sesión se cerrará de inmediato y el sistema te obligará a registrar una nueva contraseña. ¿Estás segura?';
    this.confirmActionCallback = () => {
      this.http.post('/api/profile/force-password-reset', {}, { headers: this.getHeaders() }).subscribe({
        next: (res: any) => {
          this.toastService.warning(res.message || 'Se requerirá cambio de contraseña en el próximo ingreso.');
          setTimeout(() => {
            this.logout();
          }, 2000);
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Error al intentar forzar el cambio de clave.');
        }
      });
    };
    this.confirmModalVisible = true;
  }

  // Bloque para procesar, comprimir y subir la nueva imagen de avatar del usuario

  subirAvatar(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Bloque de compresión de imagen antes de la subida
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Bloque de cálculo de dimensiones preservando proporción
          const MAX_SIZE = 500;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Bloque de conversión de canvas a archivo de imagen
            canvas.toBlob((blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                
                const formData = new FormData();
                formData.append('avatar', compressedFile);

                this.http.post('/api/profile/avatar', formData, { 
                  headers: this.getHeaders()
                }).subscribe({
                  next: (res: any) => {
                    this.userAvatar = res.avatar_url;
                    
                    // Bloque para actualizar datos en sessionStorage
                    const currentUser = this.authService.getUser();
                    if (currentUser) {
                      currentUser.avatar_url = this.userAvatar;
                      sessionStorage.setItem('current_user', JSON.stringify(currentUser));
                    }

                    this.toastService.success('Avatar actualizado correctamente');
                  },
                  error: (err) => {
                    console.error(err);
                    let errorMsg = 'Error al subir el avatar. Inténtalo de nuevo.';
                    if (err.error && err.error.message) {
                      errorMsg = err.error.message;
                    }
                    this.toastService.error(errorMsg);
                  }
                });
              }
            }, 'image/jpeg', 0.8);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  }

  // --- MÉTODOS DE COMUNICACIÓN Y CORREO MASIVO ---
  // Bloque para enviar campañas masivas de marketing por correo mediante la API de Brevo


  enviarCampanaBrevo() {
    if (!this.asuntoBrevo.trim() || !this.mensajeBrevo.trim()) {
      this.toastService.warning('El asunto y el mensaje son obligatorios.');
      return;
    }

    this.isEnviandoBrevo = true;
    this.toastService.info('Enviando campaña a través de Brevo...');

    const token = sessionStorage.getItem('auth_token');
    
    const formData = new FormData();
    formData.append('asunto', this.asuntoBrevo);
    formData.append('mensaje', this.mensajeBrevo);
    if (this.archivoAdjuntoBrevo) {
      formData.append('adjunto', this.archivoAdjuntoBrevo);
    }

    this.http.post(`/api/comercial/enviar-masivo`, formData, { 
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.isEnviandoBrevo = false;
        this.toastService.success(`¡Campaña enviada exitosamente a ${res.cantidad_enviados || 'todos los'} interesados!`);
        this.asuntoBrevo = '';
        this.mensajeBrevo = '';
        this.archivoAdjuntoBrevo = null;
        this.cdr.detectChanges();
        
      },
      error: (err) => {
        this.isEnviandoBrevo = false;
        console.error('Error enviando campaña:', err);
        this.toastService.error('Hubo un error al enviar. Revisa la consola o asegúrate de que Brevo permita el remitente.');
        this.cdr.detectChanges();
        
      }
    });
  }

  // Bloque para actualizar el estado del ciclo de vida del prospecto comercial
  cambiarEstadoLead(id: number, nuevoEstado: string) {
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http
      .patch(`/api/leads/${id}`, { estado: nuevoEstado }, { headers })
      .subscribe({
        next: () => {
          this.cargarLeads();
        },
        error: () => this.toastService.error('Error al actualizar estado del interesado.'),
      });
  }

  // Bloque para eliminar un prospecto comercial del sistema tras confirmación
  eliminarLead(id: number) {
    this.abrirConfirmacion('Confirmar Acción', '¿Estás seguro de que deseas eliminar este lead? Esta acción no se puede deshacer.', () => {
      const token = sessionStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      this.http.delete(`/api/leads/${id}`, { headers }).subscribe({
        next: () => {
          this.cargarLeads();
        },
        error: () => this.toastService.error('Error al eliminar el lead.'),
      });
    });
  }
  // Bloque para consultar el listado de solicitudes de cambios administrativos


  cargarSolicitudes() {
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any[]>('/api/admin-requests', { headers }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.solicitudesPendientes = data.filter((s: any) => s.estado === 'pendiente').length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar solicitudes', err),
    });
  }
  // Bloque para consultar los tickets de soporte técnico reportados por empresas


  cargarTicketsSoporte() {
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any[]>('/api/saas/soporte', { headers }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.ticketsSoporte = data;
        this.ticketsSoportePendientes = data.filter((t: any) => t.estado === 'Abierto' || t.estado === 'En progreso').length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar tickets de soporte', err)
    });
  }
  // Bloque para resetear la paginación al cambiar filtros de tickets
  onFiltroTicketChange() {
    this.pageTickets = 1;
  }

  // Bloque para limpiar todos los filtros del módulo de soporte
  limpiarFiltrosTicket() {
    this.filtroEmpresaTicket = '';
    this.filtroFechaTicket = '';
    this.filtroTipoTicket = '';
    this.filtroEstadoTicket = '';
    this.pageTickets = 1;
  }

  // Bloque para abrir el detalle y formulario de respuesta de un ticket de soporte
  abrirTicket(ticket: any) {
    this.ticketSeleccionado = ticket;
    this.isModalTicketOpen = true;
    this.respuestaTicket = ticket.notas_resolucion || '';
    this.estadoNuevoTicket = (ticket.estado === 'Cerrado' || ticket.estado === 'Resuelto') ? ticket.estado : 'Resuelto';
  }

  // Bloque para cerrar la vista de atención del ticket de soporte
  cerrarModalTicket() {
    this.isModalTicketOpen = false;
    this.ticketSeleccionado = null;
    this.respuestaTicket = '';
  }

  // Bloque para enviar la respuesta técnica y actualizar el estado del ticket
  responderTicket() {
    if (!this.respuestaTicket.trim() || !this.ticketSeleccionado) {
      this.toastService.warning('La respuesta no puede estar vacía.');
      return;
    }
    
    this.isRespondiendoTicket = true;
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    this.http.put(`/api/saas/soporte/${this.ticketSeleccionado.id}`, 
      { 
        notas_resolucion: this.respuestaTicket, 
        estado: this.estadoNuevoTicket || 'Resuelto',
        tecnico_id: this.user?.id || 1
      }, 
      { headers }
    ).subscribe({
      next: () => {
        this.toastService.success('Ticket actualizado y guardado correctamente.');
        this.isRespondiendoTicket = false;
        this.cerrarModalTicket();
        this.cargarTicketsSoporte();
      },
      error: (err) => {
        console.error(err);
        this.toastService.error('Error al enviar la respuesta.');
        this.isRespondiendoTicket = false;
      }
    });
  }


  // Bloque para abrir el visor detallado de una solicitud administrativa
  abrirSolicitud(req: any) {
    this.solicitudSeleccionada = req;
    
    // Bloque de parseo de datos en formato JSON
    if (this.solicitudSeleccionada.datos_nuevos && typeof this.solicitudSeleccionada.datos_nuevos === 'string') {
      try {
        this.solicitudSeleccionada.datosPropuestos = JSON.parse(this.solicitudSeleccionada.datos_nuevos);
      } catch (e) {
        this.solicitudSeleccionada.datosPropuestos = null;
      }
    } else if (this.solicitudSeleccionada.datos_nuevos && typeof this.solicitudSeleccionada.datos_nuevos === 'object') {
      this.solicitudSeleccionada.datosPropuestos = this.solicitudSeleccionada.datos_nuevos;
    }

    this.mensajeRespuesta = '';
    
    // Bloque de inicialización de campos aprobados por defecto
    this.camposAprobados = {};
    if (this.solicitudSeleccionada.datosPropuestos) {
      Object.keys(this.solicitudSeleccionada.datosPropuestos).forEach(key => {
        if (key !== 'temp_doc') {
          this.camposAprobados[key] = true;
        }
      });
    }

    this.isModalSolicitudOpen = true;
  }

  // Bloque para construir la URL de descarga de archivos adjuntos de solicitudes
  getArchivoUrl(path: string, forceDownload: boolean = false): string {
    if (!path) return '';
    if (path.startsWith('http')) {
      if (forceDownload && path.includes('/upload/')) {
        return path.replace('/upload/', '/upload/fl_attachment/');
      }
      return path;
    }
    return `http://localhost:8000/storage/${path}`;
  }
  // Bloque para cerrar el visor de la solicitud administrativa


  cerrarModalSolicitud() {
    this.isModalSolicitudOpen = false;
    this.solicitudSeleccionada = null;
    this.archivoMigracionCorregido = null;
  }

  // Bloque para descargar la plantilla o archivo de migración de datos adjunto
  descargarArchivoMigracion() {
    if (!this.solicitudSeleccionada) return;
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.toastService.info('Descargando archivo subido por la empresa...');
    this.http.get(`/api/admin-requests/${this.solicitudSeleccionada.id}/archivo`, { headers, responseType: 'blob' as 'json' }).subscribe({
      next: (data: any) => {
        const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `base_datos_empresa_${this.solicitudSeleccionada.empresa_id}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.success('Archivo descargado.');
      },
      error: () => this.toastService.error('Error al descargar el archivo.')
    });
  }

  // Bloque para capturar el archivo de corrección para la migración de datos
  onArchivoMigracionSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivoMigracionCorregido = input.files?.[0] ?? null;
  }

  // Bloque para aprobar e importar directamente los datos del archivo provisto por la empresa

  aprobarEImportar() {
    if (!this.solicitudSeleccionada) return;
    this.importandoMigracion = true;
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post(`/api/admin-requests/${this.solicitudSeleccionada.id}/aprobar-importar`, {}, { headers }).subscribe({
      next: (res: any) => {
        this.importandoMigracion = false;
        const r = res.resumen;
        const resumen = r
          ? ` Clientes: ${r.clientes} · Proveedores: ${r.proveedores} · Productos: ${r.productos} · Servicios: ${r.servicios} · Empleados: ${r.empleados} · Omitidas: ${r.omitidos}`
          : '';
        this.toastService.success(res.message + resumen);
        this.solicitudSeleccionada = res.solicitud;
        this.cargarSolicitudes();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.importandoMigracion = false;
        this.toastService.error(err.error?.error || 'Error al importar los datos.');
        this.cdr.detectChanges();
      }
    });
  }
  // Bloque para ejecutar la importación de datos masivos desde un archivo Excel corregido


  importarMigracion() {
    if (!this.solicitudSeleccionada) return;
    if (!this.archivoMigracionCorregido) {
      this.toastService.warning('Selecciona el archivo corregido para importar.');
      return;
    }
    const ext = this.archivoMigracionCorregido.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      this.toastService.error('Formato no válido. Use .xlsx, .xls o .csv.');
      return;
    }

    this.importandoMigracion = true;
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    const formData = new FormData();
    formData.append('archivo', this.archivoMigracionCorregido);

    this.http.post(`/api/admin-requests/${this.solicitudSeleccionada.id}/importar`, formData, { headers }).subscribe({
      next: (res: any) => {
        this.importandoMigracion = false;
        const resumen = res.resumen
          ? ` Clientes: ${res.resumen.clientes} · Proveedores: ${res.resumen.proveedores} · Productos: ${res.resumen.productos} · Servicios: ${res.resumen.servicios} · Empleados: ${res.resumen.empleados} · Omitidas: ${res.resumen.omitidos}`
          : '';
        this.toastService.success(res.message + resumen);
        this.solicitudSeleccionada = res.solicitud;
        this.archivoMigracionCorregido = null;
        this.cargarSolicitudes();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.importandoMigracion = false;
        console.error(err);
        this.toastService.error(err.error?.message || 'Error al importar la base de datos.');
      }
    });
  }

  // Bloque para procesar, aprobar o rechazar una solicitud de cambio administrativo
  procesarSolicitud(accion: string) {
    if (accion === 'rechazado' && !this.mensajeRespuesta) {
      this.toastService.warning('Debes ingresar un motivo en caso de rechazo.');
      return;
    }

    if (!this.solicitudSeleccionada) return;

    const empresaId = this.solicitudSeleccionada.empresa_id;

    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    // Bloque de filtrado de campos aprobados para el envío
    const approvedFields = accion === 'aprobado' 
      ? Object.keys(this.camposAprobados).filter(k => this.camposAprobados[k]) 
      : [];

    const body = {
      accion: accion,
      mensaje: this.mensajeRespuesta,
      approved_fields: approvedFields
    };

    this.http
      .patch(
        `/api/admin-requests/${this.solicitudSeleccionada.id}/process`,
        body,
        { headers },
      )
      .subscribe({
        next: () => {
          this.showSuccessModal = true;
          this.isModalSolicitudOpen = false;
          this.solicitudSeleccionada = null;
          this.mensajeRespuesta = '';
          this.cargarSolicitudes();
          this.cargarEmpresas();

          if (accion === 'aprobado') {
            this.currentView = 'empresas';
            this.empresaDestacadaId = empresaId;
            setTimeout(() => {
              this.empresaDestacadaId = null;
            }, 10000);
          }
        },
        error: () => this.toastService.error('Error al procesar solicitud.'),
      });
  }
  // Bloque para marcar una solicitud como resuelta rápidamente desde la bandeja


  marcarComoResueltaRapido(solicitud: any) {
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    const body = {
      accion: 'aprobado',
      mensaje: 'Resuelta.',
    };

    this.http
      .patch(
        `/api/admin-requests/${solicitud.id}/process`,
        body,
        { headers },
      )
      .subscribe({
        next: () => {
          this.cargarSolicitudes();
        },
        error: () => this.toastService.error('Error al procesar solicitud.'),
      });
  }
  // Bloque para consultar la lista de todas las empresas clientes registradas


  cargarEmpresas() {
    this.isLoadingEmpresas = true;
    this.empresaService.getEmpresas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.isLoadingEmpresas = false;
        this.empresas = data;
        this.empresasEnMora = data.filter((e: any) => e.activo && e.estado_pago === 'mora').length;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingEmpresas = false;
        console.error('Error al cargar:', err);
      }
    });
  }

  // Bloque para registrar la renovación de suscripción mensual de una empresa
  renovarSuscripcion(id: number) {
    if (confirm('¿Estás seguro de registrar una nueva renovación? Se sumará 1 al contador y se adelantará el próximo pago 30 días.')) {
      this.empresaService.renovarSuscripcion(id).subscribe({
        next: (res) => {
          this.cargarSuscripciones(); // Recargar la tabla
        },
        error: (err) => console.error('Error al renovar suscripción', err)
      });
    }
  }

  // Bloque para registrar la no renovación de suscripción y desactivar servicios
  noRenovarSuscripcion(id: number) {
    if (confirm('¿Estás seguro de NO renovar esta suscripción? El cliente pasará a Inactivo.')) {
      this.empresaService.noRenovarSuscripcion(id).subscribe({
        next: () => this.cargarSuscripciones(),
        error: (err) => console.error('Error al cancelar', err)
      });
    }
  }

  confirmModalVisible = false;
  confirmModalTitle = '';
  confirmModalMessage = '';
  confirmActionCallback: (() => void) | null = null;

  abrirConfirmacion(titulo: string, mensaje: string, accion: () => void) {
    this.confirmModalTitle = titulo;
    this.confirmModalMessage = mensaje;
    this.confirmActionCallback = accion;
    this.confirmModalVisible = true;
  }
  // Bloque para ejecutar la acción pendiente confirmada por el usuario en el modal


  ejecutarConfirmacion() {
    if (this.confirmActionCallback) {
      this.confirmActionCallback();
    }
    this.cerrarConfirmacion();
  }
  // Bloque para cancelar y cerrar el modal de confirmación global


  cerrarConfirmacion() {
    this.confirmModalVisible = false;
    this.confirmActionCallback = null;
  }

  modalTarifasGlobalesVisible = false;
  // Bloque para abrir el catálogo maestro de tarifas globales para su edición


  abrirModalTarifasGlobales() {
    this.modalTarifasGlobalesVisible = true;
  }
  // Bloque para cerrar la vista del catálogo de tarifas globales


  cerrarModalTarifasGlobales() {
    this.modalTarifasGlobalesVisible = false;
  }
  // Bloque para persistir las actualizaciones de precios y planes en el catálogo global


  guardarTarifasCatalogo() {
    const items = this.catalogoTarifas.map((t: any) => ({ id: t.id, valor: Number(t.valor) }));
    this.tarifaService.updateCatalogo(items).subscribe({
      next: () => {
        this.toastService.success('Catálogo de tarifas actualizado correctamente.');
        this.cerrarModalTarifasGlobales();
        this.cargarCatalogoTarifas();
        this.cargarSuscripciones();
      },
      error: (err) => console.error('Error guardando catálogo de tarifas', err)
    });
  }
  // Bloque getter para agrupar las tarifas del catálogo según su categoría comercial


  get gruposTarifas() {
    const orden: { titulo: string; tipo: string }[] = [
      { titulo: 'Planes', tipo: 'plan' },
      { titulo: 'Paquetes Adicionales', tipo: 'modulo_adicional' },
      { titulo: 'Inteligencia Artificial', tipo: 'ia_plan' },
      { titulo: 'Conectores / Add-ons', tipo: 'addon' },
      { titulo: 'Descuentos', tipo: 'descuento' },
    ];
    return orden
      .map(g => ({ titulo: g.titulo, items: this.catalogoTarifas.filter((t: any) => t.tipo === g.tipo) }))
      .filter(g => g.items.length > 0);
  }
  // Bloque para consultar las estadísticas generales y listado de suscripciones SaaS


  cargarSuscripciones() {
    this.empresaService.getSuscripcionesStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.statsSuscripciones = data.stats;
        this.suscripcionesList = data.lista;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar suscripciones:', err),
    });
  }
  // Bloque para consultar métricas operativas y tiempo de actividad del sistema


  cargarSystemStats() {
    this.empresaService.getSystemStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.serverStatus = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar system stats:', err),
    });
  }
  // Bloque para obtener la fecha actual en formato legible ISO para el sistema


  getFechaActualSistema(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // Bloque para inicializar el formulario de creación de una nueva empresa cliente


  abrirModalCrearEmpresa() {
    this.isEditMode = false;
    this.editingId = null;
    this.listaDescuentosEmpresa = [];
    this.nuevaEmpresa = { 
      razon_social: '', 
      dominio: '',
      nit: '', 
      plan_suscripcion: 'Emprendedor', 
      fecha_inscripcion: this.getFechaActualSistema(), 
      periodo: 'Mensual', 
      descuento: 'N/A',
      nombre_gerente: '',
      apellido_gerente: ''
    };
    this.showModal = true;
  }
  // Bloque para generar sugerencias automáticas de subdominio según la razón social


  generarDominio() {
    if (!this.nuevaEmpresa.razon_social) return;

    if (this.opcionesDominio.length === 0 || this.nuevaEmpresa.razon_social !== this.lastRazonSocialGenerada) {
      // Bloque de normalización y limpieza de texto base
      let cleanText = this.nuevaEmpresa.razon_social.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, '').trim();
      let tokens = cleanText.split(/\s+/);
      
      // Bloque de remoción de sufijos corporativos
      const suffixes = ['sa', 'sas', 'ltda', 'cia', 'inc', 'llc', 'srl', 'solutions', 'group'];
      const tokensNoSuffix = tokens.filter((t: string) => !suffixes.includes(t));
      
      let opciones = new Set<string>();
      
      // Bloque de construcción de variantes de subdominio
      if (tokensNoSuffix.length > 0) opciones.add(tokensNoSuffix.join(''));
      
      
      opciones.add(tokens[0]);
      
      
      if (tokens.length > 1) opciones.add(tokens[0] + tokens[1]);
      if (tokensNoSuffix.length > 1) opciones.add(tokensNoSuffix[0] + tokensNoSuffix[1]);
      
      
      if (tokens.length > 1) opciones.add(tokens.map((t: string) => t.charAt(0)).join(''));
      
      
      opciones.add(tokens.join(''));

      
      if (tokensNoSuffix.length > 0) opciones.add(tokensNoSuffix.join('') + Math.floor(Math.random() * 100));

      this.opcionesDominio = Array.from(opciones).filter(o => o.length >= 3);
      this.dominioIndex = 0;
      this.lastRazonSocialGenerada = this.nuevaEmpresa.razon_social;
    } else {
      // Bloque para ciclar a la siguiente sugerencia
      this.dominioIndex = (this.dominioIndex + 1) % this.opcionesDominio.length;
    }

    if (this.opcionesDominio.length > 0) {
      this.nuevaEmpresa.dominio = this.opcionesDominio[this.dominioIndex];
    }
  }
  // Bloque para abrir el modal o vista de gestión de empresa


  abrirModal() {
    this.isEditMode = false;
    this.editingId = null;
    this.listaDescuentosEmpresa = [];
    this.nuevaEmpresa = { 
      razon_social: '', 
      dominio: '',
      nit: '', 
      plan_suscripcion: 'Emprendedor', 
      tipo_empresa: 'Ventas',
      tipo_identificacion: 'NIT',
      fecha_inscripcion: this.getFechaActualSistema(), 
      periodo: 'Mensual', 
      descuento: 'N/A',
      color_primario: '#6366f1',
      color_secundario: '#1e293b',
      color_fondo: '#4c808a',
      color_texto: '#f8fafc',
      nombre_gerente: '',
      apellido_gerente: '',
      documento_gerente: ''
    };
    this.showModal = true;
  }
  // Bloque para precargar los datos de una empresa existente para su edición


  editarEmpresa(empresa: any) {
    this.isEditMode = true;
    this.editingId = empresa.id;
    this.listaDescuentosEmpresa = (empresa.descuento && empresa.descuento !== 'N/A') ? empresa.descuento.split(',').map((d: string) => d.trim()) : [];
    this.nuevaEmpresa = {
      razon_social: empresa.razon_social,
      dominio: empresa.dominio || '',
      nit: empresa.nit,
      email: empresa.email || '',
      plan_suscripcion: empresa.plan_suscripcion || 'Emprendedor',
      tipo_empresa: empresa.tipo_empresa === 'Ventas y Servicios' ? 'Mixto' : (empresa.tipo_empresa || 'Ventas'),
      tipo_identificacion: empresa.tipo_identificacion || 'NIT',
      fecha_inscripcion: empresa.fecha_inscripcion ? empresa.fecha_inscripcion.substring(0, 10) : '',
      periodo: empresa.periodo || 'Mensual',
      descuento: empresa.descuento || 'N/A',
      color_primario: empresa.color_primario || '#6366f1',
      color_secundario: empresa.color_secundario || '#1e293b',
      color_fondo: empresa.color_fondo || '#4c808a',
      color_texto: empresa.color_texto || '#f8fafc',
      nombre_gerente: empresa.gerente?.primer_nombre || '',
      apellido_gerente: empresa.gerente?.primer_apellido || '',
      primer_nombre_gerente: empresa.gerente?.primer_nombre || '',
      segundo_nombre_gerente: empresa.gerente?.segundo_nombre || '',
      primer_apellido_gerente: empresa.gerente?.primer_apellido || '',
      segundo_apellido_gerente: empresa.gerente?.segundo_apellido || '',
      tipo_documento_gerente: empresa.tipo_documento_gerente || 'CC',
      documento_gerente: empresa.gerente?.documento || ''
    };
    this.showModal = true;
  }

  // Bloque para añadir un concepto de descuento en el formulario de empresa
  agregarDescuentoEmpresaForm() {
    this.listaDescuentosEmpresa.push('N/A');
  }
  // Bloque para remover un descuento asignado a la empresa en el formulario


  eliminarDescuentoEmpresaForm(index: number) {
    this.listaDescuentosEmpresa.splice(index, 1);
  }

  // Bloque para abrir el modal de adición de un nuevo conector o add-on personalizado
  agregarConector() {
    this.nombreNuevoAddon = '';
    this.showAddonModal = true;
  }
  // Bloque para cerrar el modal de gestión de conectores o add-ons


  cerrarAddonModal() {
    this.showAddonModal = false;
    this.nombreNuevoAddon = '';
    this.editingAddonId = null;
  }
  // Bloque para cargar un conector existente en el formulario para editar su nombre


  abrirEditAddon(addon: any) {
    this.editingAddonId = addon.id;
    this.nombreNuevoAddon = addon.nombre;
    this.showAddonModal = true;
  }

  // Bloque para eliminar un conector o add-on personalizado del catálogo
  eliminarAddon(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este conector permanentemente del sistema?')) {
      this.modulosService.eliminarModuloGlobal(id).subscribe({
        next: () => {
          const addonsPaquete = this.paquetesModulos.find(p => p.id === 'addons');
          if (addonsPaquete) {
            addonsPaquete.modulos = addonsPaquete.modulos.filter((s: any) => s.id !== id);
          }
          this.toastService.success(`Conector eliminado exitosamente.`);
          
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Error al eliminar el conector en el servidor.');
        }
      });
    }
  }
  // Bloque para registrar o actualizar un conector o add-on personalizado


  guardarNuevoAddon() {
    if (!this.nombreNuevoAddon.trim()) {
      this.toastService.warning('Por favor, ingresa un nombre para el conector.');
      return;
    }

    const addonsPaquete = this.paquetesModulos.find(p => p.id === 'addons');
    if (!addonsPaquete) return;

    if (this.editingAddonId) {
      this.modulosService.editarModuloGlobal(this.editingAddonId, this.nombreNuevoAddon.trim()).subscribe({
        next: () => {
          const sub = addonsPaquete.modulos.find((s: any) => s.id === this.editingAddonId);
          if (sub) {
            sub.nombre = this.nombreNuevoAddon.trim();
          }
          this.toastService.success(`¡Conector "${this.nombreNuevoAddon}" actualizado exitosamente!`);
          
          this.cerrarAddonModal();
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Error al actualizar el conector en el servidor.');
        }
      });
    } else {
      const newId = 'a_' + this.nombreNuevoAddon.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      this.modulosService.crearModuloGlobal(newId, this.nombreNuevoAddon.trim(), 'addons').subscribe({
        next: () => {
          addonsPaquete.modulos.push({
            id: newId,
            nombre: this.nombreNuevoAddon.trim(),
            activo: false
          });
          
          this.toastService.success(`¡Conector "${this.nombreNuevoAddon}" agregado exitosamente al catálogo global!`);
          
          this.cerrarAddonModal();
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Error al guardar el conector en el servidor. Puede que el ID ya exista.');
        }
      });
    }
  }

  // Bloque para alternar la activación de un submódulo individual para una empresa
  toggleModulo(paqueteId: string, moduloId: string) {
    if (!this.empresaSeleccionadaId) {
      this.toastService.warning('Por favor selecciona una empresa primero.');
      return;
    }
    const paquete = this.paquetesModulos.find((p) => p.id === paqueteId);
    if (paquete) {
      const sub = paquete.modulos.find((s: any) => s.id === moduloId);
      if (sub) {
        sub.activo = !sub.activo;
        paquete.activo = paquete.modulos.some((s: any) => s.activo);
      }
    }
  }

  // Bloque para activar o desactivar todos los submódulos de un paquete comercial
  togglePaqueteCompleto(paqueteId: string, activar: boolean) {
    if (!this.empresaSeleccionadaId) {
      this.toastService.warning('Por favor selecciona una empresa primero.');
      return;
    }
    const paquete = this.paquetesModulos.find((p) => p.id === paqueteId);
    if (paquete) {
      paquete.activo = activar;
      paquete.modulos.forEach((sub: any) => {
        if (sub.activo !== activar) {
          sub.activo = activar;
        }
      });
    }
  }

  // Bloque para alternar el acordeón desplegable de un paquete de módulos
  togglePaqueteExpanded(paqueteId: string) {
    this.paquetesExpandidos[paqueteId] = !this.paquetesExpandidos[paqueteId];
  }

  // Bloque para asociar un add-on o conector a un paquete específico de la empresa
  anexarAddon() {
    this.toastService.info('Funcionalidad en desarrollo: Aquí se desplegará el catálogo de conectores externos (Ej. APIs, Software Contable, etc.) de los cuales GestivaPyme ofrece integración.');
  }

  // Bloque para guardar la asignación de módulos y paquetes de la empresa en base de datos
  guardarPaquete(paqueteId: string) {
    if (!this.empresaSeleccionadaId) {
      this.toastService.warning('Por favor selecciona una empresa primero.');
      return;
    }
    const empresaId: string = this.empresaSeleccionadaId;
    const paquete = this.paquetesModulos.find((p) => p.id === paqueteId);
    if (paquete) {
      const modulosState = paquete.modulos.map((sub: any) => ({
        id: sub.id,
        activo: sub.activo
      }));
      this.guardandoPaqueteId = paqueteId;
      this.toastService.info('Guardando cambios...');
      this.modulosService.updatePaqueteEmpresa(empresaId, modulosState).subscribe({
        next: (res) => {
          console.log(`Paquete ${paquete.nombre} actualizado masivamente`, res);
          this.guardandoPaqueteId = null;
          this.toastService.success(`¡Los cambios al paquete ${paquete.nombre} se han guardado correctamente!`);
          // Bloque de recarga desde el servidor para sincronizar estado real
          this.cargarModulosDeEmpresa(empresaId);
        },
        error: (err) => {
          this.guardandoPaqueteId = null;
          console.error('Error al actualizar paquete masivamente', err);
          this.toastService.error('Error al guardar el paquete en el servidor.');
        }
      });
    }
  }

  // Bloque para cargar la configuración modular de una empresa seleccionada
  seleccionarEmpresaModulos(event: any) {
    this.empresaSeleccionadaId = event.target.value;
    console.log('Empresa seleccionada para módulos:', this.empresaSeleccionadaId);

    const empresa = this.empresas.find(e => e.id == this.empresaSeleccionadaId);
    if (empresa) {
      this.serverStatus.status = empresa.estado_servidor || 'online';
      this.serverStatus.lastActivity = empresa.ultimo_ping ? new Date(empresa.ultimo_ping).toLocaleString() : 'Hace unos instantes';
    }

    if (this.empresaSeleccionadaId) {
      // Bloque de limpieza del estado UI previo a cargar nueva empresa
      this.paquetesModulos.forEach(p => {
        p.activo = false;
        p.modulos.forEach((s: any) => s.activo = false);
      });
      this.cargarModulosDeEmpresa(this.empresaSeleccionadaId);
    }
  }

  // Bloque para consultar los módulos habilitados de una empresa desde el backend
  cargarModulosDeEmpresa(empresaId: string) {
    this.modulosService.getModulosPorEmpresa(empresaId).subscribe({
      next: (res) => {
        console.log('Módulos de la empresa obtenidos:', res);
        this.actualizarUIModulos(res.modulos);
      },
      error: (err) => {
        console.error('Error al obtener los módulos de la empresa', err);
      },
    });
  }

  // Bloque para sincronizar la estructura visual de módulos según los datos cargados
  actualizarUIModulos(modulosBD: any) {
    Object.keys(modulosBD).forEach((paqueteClave) => {
      const paqueteUI = this.paquetesModulos.find(
        (p) => p.nombre.toLowerCase().includes(paqueteClave) || p.id === paqueteClave,
      );
      if (paqueteUI) {
        const subsDB = modulosBD[paqueteClave];
        
        subsDB.forEach((sDB: any) => {
          const subUI = paqueteUI.modulos.find((sUI: any) => sUI.id === sDB.id);
          
          if (subUI) {
            subUI.activo = sDB.activo;
            if (paqueteClave === 'addons') {
              subUI.nombre = sDB.nombre;
            }
          } else {
            paqueteUI.modulos.push({
              id: sDB.id,
              nombre: sDB.nombre,
              activo: sDB.activo
            });
          }
        });

        paqueteUI.activo = paqueteUI.modulos.some((s: any) => s.activo);
      }
    });
    this.cdr.detectChanges();
  }
  // Bloque para cerrar la vista o modal de creación y edición de empresa


  cerrarModal() {
    this.showModal = false;
    this.isEditMode = false;
    this.editingId = null;
    this.listaDescuentosEmpresa = [];
    this.nuevaEmpresa = { razon_social: '', dominio: '', nit: '', email: '', plan_suscripcion: 'Emprendedor', fecha_inscripcion: this.getFechaActualSistema(), periodo: 'Mensual', descuento: 'N/A', nombre_gerente: '', apellido_gerente: '', documento_gerente: '' };
  }
  // Bloque para cerrar el modal de éxito con las credenciales generadas



  cerrarSuccessModal() {
    this.showSuccessModal = false;
  }
  // Bloque para registrar una nueva empresa o guardar cambios en una existente


  guardarEmpresa() {
    this.isSubmitting = true;
    // Bloque de preparación del campo descuento para envío
    this.nuevaEmpresa.descuento = this.listaDescuentosEmpresa.filter(d => d !== 'N/A').length > 0 
      ? this.listaDescuentosEmpresa.filter(d => d !== 'N/A').join(', ') 
      : 'N/A';

    let payload = { ...this.nuevaEmpresa };
    if (!this.isEditMode) {
      payload.fecha_inscripcion = this.getFechaActualSistema();
    } else if (payload.fecha_inscripcion === '') {
      payload.fecha_inscripcion = null;
    }
    
    if (this.isEditMode && this.editingId) {
      this.empresaService.updateEmpresa(this.editingId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.cargarEmpresas();
          this.cargarSuscripciones();
          this.cerrarModal();
        },
        error: (err) => {
          this.isSubmitting = false;
          let msg = 'Error al actualizar la empresa.';
          
          if (err.error && err.error.errors) {
            const firstErrorField = Object.keys(err.error.errors)[0];
            msg += ' ' + err.error.errors[firstErrorField][0];
          } else if (err.error && err.error.message) {
            msg += ' ' + err.error.message;
          }
          
          this.toastService.error(msg);
          console.error(err);
        },
      });
    } else {
      this.empresaService.createEmpresa(payload).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.createdAdminEmail = response.admin_email;
          this.createdAdminPassword = response.admin_password || 'Tu número de documento';
          this.showSuccessModal = true;
          this.cargarEmpresas();
          this.cargarSuscripciones();
          this.cerrarModal();
        },
        error: (err) => {
          this.isSubmitting = false;
          let msg = 'Error al crear la empresa.';
          
          if (err.error && err.error.errors) {
            const firstErrorField = Object.keys(err.error.errors)[0];
            msg += ' ' + err.error.errors[firstErrorField][0];
          } else if (err.error && err.error.message) {
            msg += ' ' + err.error.message;
          } else {
            msg += ' Revisa los datos.';
          }
          
          this.toastService.error(msg);
          console.error(err);
        },
      });
    }
  }

  // Bloque para reenviar las credenciales de acceso al correo del gerente de la empresa

  reenviarCredenciales(empresa: any) {
    if (!confirm(`¿Reenviar credenciales de acceso a ${empresa.razon_social}? Se generará una nueva contraseña temporal.`)) return;
    
    this.http.post(`/api/empresas/${empresa.id}/reenviar-credenciales`, {}, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.toastService.success(res.message || 'Credenciales reenviadas con éxito.');
      },
      error: (err) => {
        let msg = 'Error al reenviar credenciales.';
        if (err.error?.message) msg = err.error.message;
        this.toastService.error(msg);
        console.error(err);
      }
    });
  }

  // Bloque para alternar el estado operativo de una empresa cliente
  cambiarEstadoEmpresa(empresa: any, accion: string) {
    let msg = '';
    if (accion === 'mora') msg = 'inactivar parcialmente (Mora)';
    if (accion === 'inactivar') msg = 'inactivar totalmente';
    if (accion === 'activar') msg = 'activar';

    if (confirm(`¿Estás seguro de ${msg} a la empresa ${empresa.razon_social}?`)) {
      this.empresaService.toggleStatus(empresa.id, accion).subscribe({
        next: () => {
          this.cargarEmpresas();
          this.empresaDestacadaId = null;
        },
        error: () => this.toastService.error('Error al cambiar el estado de la empresa.'),
      });
    }
  }
  // Bloque para abrir o cerrar el menú de opciones de accesibilidad visual


  toggleAccessibilityMenu() {
    this.isAccessibilityMenuOpen = !this.isAccessibilityMenuOpen;
  }
  // Bloque para configurar el modo de daltonismo en la interfaz del sistema


  setDaltonismMode(mode: DaltonismMode) {
    this.accessibilityService.setMode(mode);
    this.isAccessibilityMenuOpen = false;
  }
  // Bloque para cerrar la sesión activa del usuario y redirigir al login


  logout(): void {
    this.authService.logout();
  }
  // Bloque para formatear el tipo de negocio en una etiqueta legible para el usuario


  formatTipo(tipo: string): string {
    if (!tipo) return '';
    return tipo.replace(/_/g, ' ');
  }
}
