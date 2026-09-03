import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
    proveedor: 'gemini', // gemini, openai, claude, personalizada
    apiKey: '',
    modo: 'apagado', // apagado, simple, avanzado
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
    contenido: '<h1 style="text-align: center;">CONTRATO DE PRESTACIÓN DE SERVICIOS SAAS</h1><p>Entre los suscritos a saber: de una parte GESTIVAPYME...</p>'
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

  get solicitudesFiltradas() {
    return this.solicitudes.filter(s => {
      const empresaStr = s.empresa?.razon_social || '';
      const matchEmpresa = empresaStr.toLowerCase().includes(this.filtroEmpresaSolicitud.toLowerCase());
      const matchFecha = this.filtroFechaSolicitud ? (s.created_at || '').includes(this.filtroFechaSolicitud) : true;
      return matchEmpresa && matchFecha;
    });
  }

  getHeaders() {
    return { 
      'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`,
      'Accept': 'application/json'
    };
  }



  // --- MÉTODOS DEL CARRITO DE SUSCRIPCIÓN ---
  cargarCatalogoTarifas() {
    this.tarifaService.getCatalogo().subscribe({
      next: (res) => {
        this.catalogoTarifas = res;
      },
      error: (err) => {
        console.error('Error al cargar catálogo de tarifas', err);
      }
    });
  }

  abrirCarritoSuscripcion(suscripcion: SuscripcionEmpresa) {
    this.suscripcionEnEdicion = suscripcion;
    this.selectedTipoEmpresa = suscripcion.tipoEmpresa || 'Ventas';
    this.iaByokActivo = suscripcion.iaByokActivo || false;
    this.iaByokProveedor = suscripcion.iaByokProveedor || 'gemini';
    this.iaByokModelo = suscripcion.iaByokModelo || 'gemini-3.5-flash-lite';
    this.iaByokKey = '';
    this.iaByokKeyExists = suscripcion.iaByokKeyExists || false;
    this.activeTabCarrito = 'plan_base';
    
    // Inicializar selección del catálogo
    this.cartItemsSelect = {};
    for (let item of this.catalogoTarifas) {
      const activeItem = (suscripcion.cartItems || []).find((c: any) => c.id === item.id);
      this.cartItemsSelect[item.id] = {
        active: !!activeItem,
        cantidad: activeItem ? activeItem.cantidad : 1
      };
    }

    // Auto-seleccionar el plan que la empresa contrató (Tipo de Plan) si aún no tiene plan en el carrito.
    // Así el precio se carga según el plan elegido en el formulario de Empresa.
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

  cerrarCarritoSuscripcion() {
    this.suscripcionEnEdicion = null;
    this.editandoSuscripcion = false;
  }

  // Desde la tabla de Empresas: navega a Suscripciones y abre el carrito con el plan
  // que la empresa contrató, cargando el precio correspondiente.
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

  // Porcentaje de descuento definido en el módulo Empresas (Referido 10%, Mes gratis...)
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

  get descuentoSuscripcion(): number {
    return this.subtotalSuscripcion * (this.descuentoEmpresaPct / 100);
  }

  get totalSuscripcion(): number {
    return Math.max(0, this.subtotalSuscripcion - this.descuentoSuscripcion);
  }

  guardandoSuscripcion = false;

  guardarCarritoSuscripcion() {
    if (!this.suscripcionEnEdicion) return;

    // Regla de Negocio: Validar que si tiene módulos especiales, el tipo de negocio base esté seleccionado
    const hasBasePackage = ['Ventas', 'Servicios', 'Ventas y Servicios'].includes(this.selectedTipoEmpresa);
    
    const itemsPayload = [];
    for (let item of this.catalogoTarifas) {
      const cartItem = this.cartItemsSelect[item.id];
      
      // Auto-seleccionar addon de BYOK si está activo
      if (item.id === 'addon_byok_ia') {
        cartItem.active = this.iaByokActivo;
      }
      
      // Apagar cobros de IA Simple/Avanzado si usa BYOK
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

  // Soporte tickets variables
  isModalTicketOpen = false;
  ticketSeleccionado: any = null;
  respuestaTicket: string = '';
  isRespondiendoTicket = false;

  public accessibilityService = inject(AccessibilityService);
  public toastService = inject(ToastService);
  private empresaService = inject(EmpresaService);
  private tarifaService = inject(TarifaService);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private modulosService: ModulosService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const vista = params.get('vista');
      if (vista) {
        this.currentView = vista;
        localStorage.setItem('saas_current_view', vista);
        if (vista === 'comercial') {
          this.cargarLeads();
        }
        if (vista === 'control-ia') {
          this.cargarConfiguracionIA();
        }
      } else {
        const savedView = localStorage.getItem('saas_current_view');
        if (savedView) {
          this.currentView = savedView;
          if (savedView === 'control-ia') {
            this.cargarConfiguracionIA();
          }
        }
      }
    });

    this.user = this.authService.getUser();
    
    // Inicializar datos del perfil
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
      this.router.navigate([ruta]);
    }

    this.modulosService.getCatalogoModulos().subscribe(catalog => {
      // Clonar profundamente para evitar fugas de estado globales (bugfix: evitar que se muestre todo abierto)
      this.paquetesModulos = JSON.parse(JSON.stringify(catalog)).filter((p: any) => p.id !== 'default');
    });

    if (typeof window !== 'undefined') {
      this.cargarEmpresas();
      this.cargarSolicitudes();
      this.cargarTicketsSoporte();
      this.cargarLeads();
      this.cargarSuscripciones();
      this.cargarCatalogoTarifas();
      this.cargarSystemStats();
    }
  }

  // Muestra el modal para gestionar las notas del cliente interesado
  abrirModalNotas(lead: any) {
    this.leadSeleccionadoParaNotas = lead;
    if (!this.leadSeleccionadoParaNotas.notas) {
      this.leadSeleccionadoParaNotas.notas = [];
    }
    // Filtrar notas caducadas (más de 90 días)
    const tresMesesAtras = new Date();
    tresMesesAtras.setDate(tresMesesAtras.getDate() - 90);
    this.leadSeleccionadoParaNotas.notas = this.leadSeleccionadoParaNotas.notas.filter((n: any) => new Date(n.fecha) > tresMesesAtras);
    
    this.showNotasModal = true;
  }

  cerrarModalNotas() {
    this.showNotasModal = false;
    this.leadSeleccionadoParaNotas = null;
    this.nuevaNotaTexto = '';
  }

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

  eliminarNota(notaId: string) {
    this.leadSeleccionadoParaNotas.notas = this.leadSeleccionadoParaNotas.notas.filter((n: any) => n.id !== notaId);
    this.guardarNotasEnBackend();
  }

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

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  cambiarVista(vista: string) {
    this.router.navigate(['/saas-admin', vista]);
    if (vista === 'contratos') {
      this.cargarContratos();
    }
  }

  // --- MÉTODOS PARA CONTRATOS SAAS ---
  cargarContratos() {
    this.http.get('/api/saas/contratos', { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.contratosHistory = res;
      },
      error: (err) => console.error('Error cargando contratos', err)
    });
  }

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
  cargarConfiguracionIA() {
    this.http.get('/api/saas/ia-config').subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (data) {
          this.iaConfigSeleccionada.proveedor = data.proveedor || 'gemini';
          this.iaConfigSeleccionada.modo = data.modo || 'apagado';
          this.iaConfigSeleccionada.apiKey = data.api_key || '';
        }
      },
      error: (err) => {
        console.error('Error cargando configuración de IA', err);
      }
    });
  }

  guardarConfiguracionIA() {
    if (!this.iaConfigSeleccionada.empresaId) {
      alert('Por favor, selecciona una empresa primero.');
      return;
    }
    if (this.iaConfigSeleccionada.modo !== 'apagado' && !this.iaConfigSeleccionada.apiKey) {
      alert('Debes ingresar una API Key para habilitar la IA.');
      return;
    }

    // Si la llave aún muestra el valor enmascarado (********), se conserva la guardada en el servidor
    const mantenerLlave = this.iaConfigSeleccionada.apiKey.startsWith('********');

    const payload: any = {
      proveedor: this.iaConfigSeleccionada.proveedor,
      empresa_id: this.iaConfigSeleccionada.empresaId, // Enviado por si a futuro se hace por empresa
      modo: this.iaConfigSeleccionada.modo,
      mantener_llave: mantenerLlave
    };
    if (!mantenerLlave) {
      payload.api_key = this.iaConfigSeleccionada.apiKey;
    }

    // Llamada HTTP al backend para guardar la configuración
    this.http.post('/api/saas/ia-config', payload).subscribe({
      next: (res: any) => {
        alert(res.message || 'Configuración de Inteligencia Artificial guardada con éxito.');
        this.cargarConfiguracionIA();
      },
      error: (err) => {
        console.error('Error guardando IA', err);
        alert('Error al guardar la configuración de IA. Verifica la conexión.');
      }
    });
  }

  setComercialTab(tab: 'interesados' | 'correos') {
    this.comercialTab = tab;
  }

  cargarLeads() {
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      this.debugError = 'NO HAY TOKEN DE SESIÓN EN LOCALSTORAGE.';
      this.cdr.detectChanges();
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const t = new Date().getTime();
    this.http.get<any[]>(`/api/leads?t=${t}`, { headers }).subscribe({
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

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoAdjuntoBrevo = file;
    }
  }

  // --- MÉTODOS DE PERFIL Y SEGURIDAD ---
  actualizarPerfil() {
    this.isUpdatingProfile = true;
    this.http.put('/api/profile', this.profileForm, { headers: this.getHeaders() }).subscribe({
        next: (res: any) => {
          this.userName = res.user.nombres;
          this.userEmail = res.user.email;
          this.userInitials = this.userName.substring(0, 2).toUpperCase();
          
          // Actualizar sessionStorage
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

  // Sube y actualiza el avatar del usuario
  subirAvatar(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Comprimir la imagen antes de subirla
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calcular nuevas dimensiones manteniendo el ratio (máximo 500px)
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
            // Convertir de vuelta a archivo (calidad 0.8)
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
                    
                    // Actualizar sessionStorage
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

  // --- MÉTODOS DE MODALES (Suscripciones / Tarifas) ---

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

  cargarSolicitudes() {
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any[]>('/api/admin-requests', { headers }).subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.solicitudesPendientes = data.filter((s: any) => s.estado === 'pendiente').length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar solicitudes', err),
    });
  }

  cargarTicketsSoporte() {
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any[]>('/api/saas/soporte', { headers }).subscribe({
      next: (data) => {
        this.ticketsSoporte = data;
        this.ticketsSoportePendientes = data.filter((t: any) => t.estado === 'Abierto' || t.estado === 'En progreso').length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar tickets de soporte', err)
    });
  }

  abrirTicket(ticket: any) {
    this.ticketSeleccionado = ticket;
    this.isModalTicketOpen = true;
    this.respuestaTicket = '';
  }

  cerrarModalTicket() {
    this.isModalTicketOpen = false;
    this.ticketSeleccionado = null;
    this.respuestaTicket = '';
  }

  responderTicket() {
    if (!this.respuestaTicket.trim() || !this.ticketSeleccionado) {
      this.toastService.warning('La respuesta no puede estar vacía.');
      return;
    }
    
    this.isRespondiendoTicket = true;
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    this.http.put(`/api/saas/soporte/${this.ticketSeleccionado.id}`, 
      { notas_resolucion: this.respuestaTicket, estado: 'Resuelto' }, 
      { headers }
    ).subscribe({
      next: () => {
        this.toastService.success('Ticket respondido correctamente.');
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


  abrirSolicitud(req: any) {
    this.solicitudSeleccionada = req;
    
    // Parsear datos nuevos si vienen en formato JSON string
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
    
    // Inicializar todos los campos propuestos como "aprobados" por defecto (excepto temp_doc)
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

  cerrarModalSolicitud() {
    this.isModalSolicitudOpen = false;
    this.solicitudSeleccionada = null;
    this.archivoMigracionCorregido = null;
  }

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

  onArchivoMigracionSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivoMigracionCorregido = input.files?.[0] ?? null;
  }

  // Para aprobar e importar el archivo original que ya subió la empresa, sin re-subirlo
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

  procesarSolicitud(accion: string) {
    if (accion === 'rechazado' && !this.mensajeRespuesta) {
      this.toastService.warning('Debes ingresar un motivo en caso de rechazo.');
      return;
    }

    if (!this.solicitudSeleccionada) return;

    const empresaId = this.solicitudSeleccionada.empresa_id;

    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    // Solo enviar los campos que fueron checkeados si se está aprobando
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

  cargarEmpresas() {
    this.isLoadingEmpresas = true;
    this.empresaService.getEmpresas().subscribe({
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

  ejecutarConfirmacion() {
    if (this.confirmActionCallback) {
      this.confirmActionCallback();
    }
    this.cerrarConfirmacion();
  }

  cerrarConfirmacion() {
    this.confirmModalVisible = false;
    this.confirmActionCallback = null;
  }

  modalTarifasGlobalesVisible = false;

  abrirModalTarifasGlobales() {
    this.modalTarifasGlobalesVisible = true;
  }

  cerrarModalTarifasGlobales() {
    this.modalTarifasGlobalesVisible = false;
  }

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

  cargarSuscripciones() {
    this.empresaService.getSuscripcionesStats().subscribe({
      next: (data) => {
        this.statsSuscripciones = data.stats;
        this.suscripcionesList = data.lista;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar suscripciones:', err),
    });
  }

  cargarSystemStats() {
    this.empresaService.getSystemStats().subscribe({
      next: (data) => {
        this.serverStatus = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar system stats:', err),
    });
  }

  abrirModalCrearEmpresa() {
    this.isEditMode = false;
    this.editingId = null;
    this.listaDescuentosEmpresa = [];
    this.nuevaEmpresa = { 
      razon_social: '', 
      dominio: '',
      nit: '', 
      plan_suscripcion: 'Emprendedor', 
      fecha_inscripcion: '', 
      periodo: 'Mensual', 
      descuento: 'N/A',
      nombre_gerente: '',
      apellido_gerente: ''
    };
    this.showModal = true;
  }

  generarDominio() {
    if (!this.nuevaEmpresa.razon_social) return;

    if (this.opcionesDominio.length === 0 || this.nuevaEmpresa.razon_social !== this.lastRazonSocialGenerada) {
      // Limpiar y preparar texto base
      let cleanText = this.nuevaEmpresa.razon_social.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, '').trim();
      let tokens = cleanText.split(/\s+/);
      
      // Remover sufijos corporativos comunes
      const suffixes = ['sa', 'sas', 'ltda', 'cia', 'inc', 'llc', 'srl', 'solutions', 'group'];
      const tokensNoSuffix = tokens.filter((t: string) => !suffixes.includes(t));
      
      let opciones = new Set<string>();
      
      // 1. Completo sin sufijos (techventasolutions -> techventa si aplicara, sino todo)
      if (tokensNoSuffix.length > 0) opciones.add(tokensNoSuffix.join(''));
      
      // 2. Solo primera palabra
      opciones.add(tokens[0]);
      
      // 3. Dos primeras palabras
      if (tokens.length > 1) opciones.add(tokens[0] + tokens[1]);
      if (tokensNoSuffix.length > 1) opciones.add(tokensNoSuffix[0] + tokensNoSuffix[1]);
      
      // 4. Siglas (tssa)
      if (tokens.length > 1) opciones.add(tokens.map((t: string) => t.charAt(0)).join(''));
      
      // 5. Original todo junto (techventasolutionssa)
      opciones.add(tokens.join(''));

      // 6. Con sufijo numerico corto
      if (tokensNoSuffix.length > 0) opciones.add(tokensNoSuffix.join('') + Math.floor(Math.random() * 100));

      this.opcionesDominio = Array.from(opciones).filter(o => o.length >= 3);
      this.dominioIndex = 0;
      this.lastRazonSocialGenerada = this.nuevaEmpresa.razon_social;
    } else {
      // Ciclar al siguiente
      this.dominioIndex = (this.dominioIndex + 1) % this.opcionesDominio.length;
    }

    if (this.opcionesDominio.length > 0) {
      this.nuevaEmpresa.dominio = this.opcionesDominio[this.dominioIndex];
    }
  }

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
      fecha_inscripcion: '', 
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

  agregarDescuentoEmpresaForm() {
    this.listaDescuentosEmpresa.push('N/A');
  }

  eliminarDescuentoEmpresaForm(index: number) {
    this.listaDescuentosEmpresa.splice(index, 1);
  }

  agregarConector() {
    this.nombreNuevoAddon = '';
    this.showAddonModal = true;
  }

  cerrarAddonModal() {
    this.showAddonModal = false;
    this.nombreNuevoAddon = '';
    this.editingAddonId = null;
  }

  abrirEditAddon(addon: any) {
    this.editingAddonId = addon.id;
    this.nombreNuevoAddon = addon.nombre;
    this.showAddonModal = true;
  }

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

  togglePaqueteExpanded(paqueteId: string) {
    this.paquetesExpandidos[paqueteId] = !this.paquetesExpandidos[paqueteId];
  }

  anexarAddon() {
    this.toastService.info('Funcionalidad en desarrollo: Aquí se desplegará el catálogo de conectores externos (Ej. APIs, Software Contable, etc.) de los cuales GestivaPyme ofrece integración.');
  }

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
          // Refresca desde el servidor para que el panel siempre muestre el estado real
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

  seleccionarEmpresaModulos(event: any) {
    this.empresaSeleccionadaId = event.target.value;
    console.log('Empresa seleccionada para módulos:', this.empresaSeleccionadaId);

    const empresa = this.empresas.find(e => e.id == this.empresaSeleccionadaId);
    if (empresa) {
      this.serverStatus.status = empresa.estado_servidor || 'online';
      this.serverStatus.lastActivity = empresa.ultimo_ping ? new Date(empresa.ultimo_ping).toLocaleString() : 'Hace unos instantes';
    }

    if (this.empresaSeleccionadaId) {
      // Limpiar el estado UI antes de cargar la nueva empresa para evitar cruce de datos
      this.paquetesModulos.forEach(p => {
        p.activo = false;
        p.modulos.forEach((s: any) => s.activo = false);
      });
      this.cargarModulosDeEmpresa(this.empresaSeleccionadaId);
    }
  }

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

  cerrarModal() {
    this.showModal = false;
    this.isEditMode = false;
    this.editingId = null;
    this.listaDescuentosEmpresa = [];
    this.nuevaEmpresa = { razon_social: '', dominio: '', nit: '', email: '', plan_suscripcion: 'Emprendedor', fecha_inscripcion: '', periodo: 'Mensual', descuento: 'N/A', nombre_gerente: '', apellido_gerente: '', documento_gerente: '' };
  }


  cerrarSuccessModal() {
    this.showSuccessModal = false;
  }

  guardarEmpresa() {
    this.isSubmitting = true;
    // Preparar el campo descuento uniendo el array
    this.nuevaEmpresa.descuento = this.listaDescuentosEmpresa.filter(d => d !== 'N/A').length > 0 
      ? this.listaDescuentosEmpresa.filter(d => d !== 'N/A').join(', ') 
      : 'N/A';

    let payload = { ...this.nuevaEmpresa };
    if (payload.fecha_inscripcion === '') payload.fecha_inscripcion = null;
    
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

  // Para reenviar las credenciales de acceso al correo de la empresa
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

  toggleAccessibilityMenu() {
    this.isAccessibilityMenuOpen = !this.isAccessibilityMenuOpen;
  }

  setDaltonismMode(mode: DaltonismMode) {
    this.accessibilityService.setMode(mode);
    this.isAccessibilityMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
  }

  formatTipo(tipo: string): string {
    if (!tipo) return '';
    return tipo.replace(/_/g, ' ');
  }
}
