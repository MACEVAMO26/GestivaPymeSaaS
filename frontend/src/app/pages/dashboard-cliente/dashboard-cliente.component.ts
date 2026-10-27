import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AccessibilityService } from '../../services/accessibility/accessibility.service';
import { ModulosService, MODULOS_BASE_UI, RUTA_MODULO, ICONO_MODULO } from '../../services/modulos.service';
import { ChangeDetectorRef } from '@angular/core';
import { IaStateService } from '../../services/ia-state/ia-state.service';
import { GestivaIaTutorialComponent } from '../../shared/components/gestiva-ia-tutorial/gestiva-ia-tutorial.component';
import { GestivaBotComponent } from '../../shared/components/gestiva-bot/gestiva-bot';

interface ModuloSidebar {
  id: string;
  nombre: string;
  icono: string;
  ruta: string;
}

@Component({
  selector: 'app-dashboard-cliente',
  standalone: true,
  imports: [CommonModule, RouterModule, GestivaIaTutorialComponent, GestivaBotComponent],
  templateUrl: './dashboard-cliente.component.html',
  styleUrl: './dashboard-cliente.component.scss'
})
export class DashboardClienteComponent implements OnInit {
  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  public accessibilityService = inject(AccessibilityService);
  private authService = inject(AuthService);
  private modulosService = inject(ModulosService);
  private iaStateService = inject(IaStateService);
  private router = inject(Router);
  public route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  // Bloque para activar el tutorial interactivo de la plataforma
  abrirTutorial() {
    this.iaStateService.triggerTutorial();
  }

  // --- VARIABLES DE ESTADO ---
  user: any = null;
  planActual: string = 'Especial';

  modulosSidebar: ModuloSidebar[] = [];
  isSidebarCollapsed = false;
  hasNotification = false;

  constructor() {}

  // Bloque getter para obtener el nombre formateado del usuario autenticado
  get nombreUsuario(): string {
    if (!this.user) return 'Usuario';
    const n = [this.user.nombres, this.user.apellidos].filter(Boolean).join(' ');
    return n || 'Usuario';
  }

  // Bloque getter para construir la descripción jerárquica del cargo y área del usuario
  get cargoUsuario(): string {
    if (!this.user) return '';
    
    // Bloque de resolución del cargo y área organizativa del empleado
    let cargoStr = this.user.empleado?.cargo?.nombre || this.user.cargo?.nombre || this.user.rol?.nombre || 'Gerente General';
    let areaStr = this.user.empleado?.area?.nombre || '';
    
    if (cargoStr && areaStr) {
      return `${cargoStr} del área de ${areaStr}`;
    }
    
    return cargoStr;
  }

  // Bloque del ciclo de vida ngOnInit para inicializar usuario, sidebar y validación de sesión
  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.construirSidebar();

    // Bloque de verificación periódica para validar la vigencia de la sesión remota
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

  // Bloque para construir dinámicamente el menú lateral según los módulos contratados
  private construirSidebar() {
    // Bloque de inicialización de módulos base del sistema siempre disponibles
    const botones: { [key: string]: ModuloSidebar } = {};
    MODULOS_BASE_UI.forEach((mod) => {
      botones[mod.id] = {
        id: mod.id,
        nombre: mod.nombre,
        icono: mod.icono,
        ruta: mod.ruta
      };
    });

    // Bloque de cálculo de plan según tipo de empresa del usuario
    if (this.user?.rol?.nombre === 'Auditor') {
      this.planActual = 'AUDITORIA';
    } else {
      const tipoEmpresaUsuario = this.user?.empresa?.tipo_empresa || 'Especial';
      this.planActual = this.calcularPlan(tipoEmpresaUsuario);
    }

    // Bloque de consulta de módulos contratados por la empresa autenticada
    if (this.user?.empresa_id) {
      this.modulosService.getMisModulos().subscribe({
        next: (resp) => {
          const modulosEmpresa = resp.modulos || {};

          // Bloque de reconstrucción de ítems de navegación según respuesta de la base de datos
          const botonesReales: { [key: string]: ModuloSidebar } = {};
          MODULOS_BASE_UI.forEach((mod) => {
            botonesReales[mod.id] = {
              id: mod.id,
              nombre: mod.nombre,
              icono: mod.icono,
              ruta: mod.ruta
            };
          });

          Object.keys(modulosEmpresa).forEach((paqueteId) => {
            const subs = modulosEmpresa[paqueteId] || [];

            if (paqueteId === 'ventas' || paqueteId === 'servicios') {
              // Bloque de procesamiento de submódulos comerciales activos
              subs.forEach((sub: any) => {
                if (sub.activo) {
                  botonesReales[sub.id] = {
                    id: sub.id,
                    nombre: sub.nombre,
                    icono: ICONO_MODULO[sub.id] || 'fas fa-circle',
                    ruta: RUTA_MODULO[sub.id] || this.slugify(sub.nombre)
                  };
                }
              });
            } else if (['rrhh', 'finanzas', 'addons', 'base'].includes(paqueteId)) {
              // Bloque de verificación de módulos con submódulos activos
              const isActivo = subs.some((s: any) => s.activo);
              if (isActivo) {
                let id = paqueteId;
                let nombre = paqueteId === 'rrhh' ? 'Gestión Humana' : (paqueteId === 'finanzas' ? 'Finanzas' : (paqueteId === 'addons' ? 'Addons+' : ''));
                let ruta = this.slugify(nombre);
                if (paqueteId === 'base') {
                  // Bloque para omitir generación de botón para el paquete base genérico
                  return;
                }
                botonesReales[id] = {
                  id,
                  nombre,
                  icono: ICONO_MODULO[id] || 'fas fa-circle',
                  ruta
                };
              }
            }
          });

          this.aplicarOrdenamiento(botonesReales);
        },
        error: () => this.aplicarOrdenamiento(botones) // Si falla, mantener los módulos base
      });
    } else {
      // Bloque de contingencia para mantener módulos base si no hay empresa asignada
      this.aplicarOrdenamiento(botones);
    }
  }


  // Bloque para determinar el nombre del plan comercial según el tipo de empresa
  private calcularPlan(tipoEmpresaUsuario: string): string {
    if (tipoEmpresaUsuario.includes('Ventas y Servicios') || tipoEmpresaUsuario === 'Mixto') return 'Mixto';
    if (tipoEmpresaUsuario === 'Ventas') return 'Ventas';
    if (tipoEmpresaUsuario === 'Servicios') return 'Servicios';
    return 'Especial';
  }

  // Bloque para parsear y obtener el mapa de permisos modulares específicos del empleado
  private getParsedModsPermitidos(): { [key: string]: boolean } | null {
    const raw = this.user?.empleado?.modulos_permitidos;
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    if (Array.isArray(raw)) {
      const obj: { [key: string]: boolean } = {};
      raw.forEach((m: string) => obj[m] = true);
      return obj;
    }
    if (typeof raw === 'object') {
      return raw;
    }
    return null;
  }

  // Bloque para filtrar y ordenar los ítems de navegación según el rol y área del usuario
  private aplicarOrdenamiento(botones: { [key: string]: ModuloSidebar }) {
    // Bloque de inyección de módulo de clientes para empresas de servicios con CRM
    if (botones['s_crm'] && !botones['v_cxc']) {
      botones['v_cxc'] = {
        id: 'v_cxc',
        nombre: 'Clientes',
        icono: 'fas fa-address-book',
        ruta: 'clientes'
      };
    }

    // Bloque de unificación de etiqueta para catálogo de servicios
    if (botones['s_cat']) {
      botones['s_cat'].nombre = 'Servicios';
    }

    const ordenDeseado = [
      'd_ini', // Inicio
      'd_adm', // Administración
      'd_tar', // Gestión de Tareas
      'd_gia', // Gestiva IA
      'd_for', // Formalización de usuarios
      'rrhh',  // Gestión Humana
      'v_prov', // Proveedores
      'v_rep',  // Compras
      'v_inv',  // Inventario
      'v_pos',  // Ventas
      'v_cxc',  // Clientes
      's_age',  // Agenda
      's_cat',  // Servicios
      'finanzas', // Finanzas
      'd_aut',  // Autogestión
      'addons'  // Addons+
    ];

    let itemsOrdenados: ModuloSidebar[] = [];
    const rolNombre = (this.user?.rol?.nombre || '').toLowerCase();
    const cargoNombre = (this.user?.cargo?.nombre || this.user?.puesto || '').toLowerCase();
    const areaNombre = (this.user?.empleado?.area?.nombre || '').toLowerCase();
    const parsedMods = this.getParsedModsPermitidos();

    const esGerente = rolNombre.includes('gerente') || rolNombre.includes('auditor');
    const esJefeRRHH = rolNombre === 'jefe de área' || rolNombre.includes('jefe') || cargoNombre.includes('recursos humanos') || cargoNombre.includes('gestión humana') || cargoNombre.includes('rrhh');
    const esFormalizado = esGerente || esJefeRRHH || this.user?.estado_formalizacion === 'Formalizado' || !!this.user?.empleado || (this.user?.cargo_id && this.user?.cargo_id > 0);

    ordenDeseado.forEach(id => {
      // Bloque de validación de acceso público a inicio y autogestión
      if (id === 'd_ini' || id === 'd_aut') {
        if (botones[id]) itemsOrdenados.push(botones[id]);
        return;
      }

      // Bloque de restricción para usuarios pendientes de formalización laboral
      if (!esFormalizado) {
        return;
      }

      // Bloque de acceso total para roles de Gerencia y Auditoría
      if (esGerente) {
        if (botones[id]) itemsOrdenados.push(botones[id]);
        return;
      }

      // Bloque de restricción de módulos exclusivos de gerencia
      if (id === 'd_gia' || id === 'd_adm') {
        return;
      }

      // Bloque de filtrado por permisos modulares personalizados del empleado
      if (parsedMods && Object.keys(parsedMods).length > 0) {
        if (parsedMods[id] && botones[id]) {
          itemsOrdenados.push(botones[id]);
        }
        return;
      }

      // Bloque de filtrado de módulos para jefatura de talento humano
      if (esJefeRRHH) {
        if (['rrhh', 'd_for', 'd_tar'].includes(id) && botones[id]) {
          itemsOrdenados.push(botones[id]);
        }
        return;
      }

      // Bloque de filtrado estricto por área organizacional del empleado
      if (areaNombre.includes('inventario') || areaNombre.includes('almacen') || areaNombre.includes('bodega')) {
        if (['v_inv', 'd_tar'].includes(id) && botones[id]) {
          itemsOrdenados.push(botones[id]);
        }
        return;
      }

      if (areaNombre.includes('comercial') || areaNombre.includes('venta')) {
        if (['v_pos', 'v_cxc', 'v_inv', 'd_tar'].includes(id) && botones[id]) {
          itemsOrdenados.push(botones[id]);
        }
        return;
      }

      if (areaNombre.includes('logística') || areaNombre.includes('compra') || areaNombre.includes('logistica')) {
        if (['v_prov', 'v_rep', 'v_inv', 'd_tar'].includes(id) && botones[id]) {
          itemsOrdenados.push(botones[id]);
        }
        return;
      }

      if (areaNombre.includes('servicio') || areaNombre.includes('técnica') || areaNombre.includes('soporte')) {
        if (['s_cat', 's_age', 'd_tar'].includes(id) && botones[id]) {
          itemsOrdenados.push(botones[id]);
        }
        return;
      }

      if (areaNombre.includes('finan') || areaNombre.includes('contab') || areaNombre.includes('tesor')) {
        if (['finanzas', 'v_rep', 'v_cxc', 'd_tar'].includes(id) && botones[id]) {
          itemsOrdenados.push(botones[id]);
        }
        return;
      }
    });

    this.modulosSidebar = itemsOrdenados;
    this.cdr.detectChanges();
  }

  // Bloque helper para verificar si un módulo específico está habilitado en los permisos personalizados
  private checkModuloCustom(modsPermitidos: any, modId: string): boolean {
    if (!modsPermitidos) return false;
    if (Array.isArray(modsPermitidos)) return modsPermitidos.includes(modId);
    if (typeof modsPermitidos === 'object') return !!modsPermitidos[modId];
    return false;
  }


  // Bloque helper para transformar nombres de módulos en segmentos de ruta URL limpios
  private slugify(text: string): string {
    if (!text) return '';
    return text.toString().toLowerCase()
      .normalize('NFD')                   // split an accented letter in the base letter and the accent
      .replace(/[\u0300-\u036f]/g, '')   // remove all previously split accents
      .replace(/\s+/g, '-')              // replace spaces with -
      .replace(/[^\w\-]+/g, '')          // remove all non-word chars
      .replace(/\-\-+/g, '-')            // replace multiple - with single -
      .replace(/^-+/, '')                // trim - from start of text
      .replace(/-+$/, '');               // trim - from end of text
  }

  // Bloque para alternar el estado colapsado o expandido de la barra lateral
  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  // Bloque para alternar el indicador de notificaciones del sistema
  toggleNotification() {
    this.hasNotification = !this.hasNotification;
  }

  // Bloque para alternar cíclicamente los modos de accesibilidad visual para daltonismo
  toggleDaltonism(): void {
    const current = this.accessibilityService.currentMode();
    const modes: ('normal' | 'protanopia' | 'deuteranopia' | 'tritanopia')[] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia'];
    const currentIndex = modes.indexOf(current);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.accessibilityService.setMode(modes[nextIndex]);
  }

  // Bloque para construir la ruta URL de inicio institucional basada en el subdominio de la empresa
  getInicioRoute(): string {
    if (this.user && this.user.empresa) {
      if (this.user.empresa.dominio) {
        return '/' + this.user.empresa.dominio + '/inicio';
      } else if (this.user.empresa.razon_social) {
        const slug = this.user.empresa.razon_social.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
        return '/' + slug + '/inicio';
      }
    }
    return '/inicio';
  }

  // Bloque para cerrar la sesión activa del usuario y redirigir al login
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
