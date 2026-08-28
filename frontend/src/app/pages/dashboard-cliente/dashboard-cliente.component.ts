import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AccessibilityService } from '../../services/accessibility/accessibility.service';
import { ModulosService, MODULOS_BASE_UI, RUTA_MODULO, ICONO_MODULO } from '../../services/modulos.service';
import { ChangeDetectorRef } from '@angular/core';
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
  // --- SERVICIOS ---
  public accessibilityService = inject(AccessibilityService);
  private authService = inject(AuthService);
  private modulosService = inject(ModulosService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // --- VARIABLES DE ESTADO ---
  user: any = null;
  planActual: string = 'Especial';

  modulosSidebar: ModuloSidebar[] = [];
  isSidebarCollapsed = false;
  hasNotification = false;

  constructor() {}

  get nombreUsuario(): string {
    if (!this.user) return 'Usuario';
    const n = [this.user.nombres, this.user.apellidos].filter(Boolean).join(' ');
    return n || 'Usuario';
  }

  get cargoUsuario(): string {
    if (!this.user) return '';
    
    // Buscar el cargo en el empleado, luego en el usuario.cargo, luego en el rol, por defecto Gerente General
    let cargoStr = this.user.empleado?.cargo?.nombre || this.user.cargo?.nombre || this.user.rol?.nombre || 'Gerente General';
    let areaStr = this.user.empleado?.area?.nombre || '';
    
    if (cargoStr && areaStr) {
      return `${cargoStr} del área de ${areaStr}`;
    }
    
    return cargoStr;
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.construirSidebar();
  }

  // --- LÓGICA DEL SIDEBAR (CATÁLOGO REAL DESDE LA BD) ---
  private construirSidebar() {
    // Módulos base del producto SIEMPRE visibles (Inicio, Administración, etc.)
    const botones: { [key: string]: ModuloSidebar } = {};
    MODULOS_BASE_UI.forEach((mod) => {
      botones[mod.id] = {
        id: mod.id,
        nombre: mod.nombre,
        icono: mod.icono,
        ruta: `./${mod.ruta}`
      };
    });

    // Plan según el tipo de empresaÁreal del usuario
    if (this.user?.rol?.nombre === 'Auditor') {
      this.planActual = 'AUDITORIA';
    } else {
      const tipoEmpresaUsuario = this.user?.empresa?.tipo_empresa || 'Especial';
      this.planActual = this.calcularPlan(tipoEmpresaUsuario);
    }

    // Consultar los módulosÁreales asignados al usuario (autenticado)
    if (this.user?.empresa_id) {
      this.modulosService.getMisModulos().subscribe({
        next: (resp) => {
          const modulosEmpresa = resp.modulos || {};

          // --- RECONSTRUIR BOTONES DESDE CERO CON LA VERDAD DE LA BASE DE DATOS ---
          const botonesReales: { [key: string]: ModuloSidebar } = {};
          MODULOS_BASE_UI.forEach((mod) => {
            botonesReales[mod.id] = {
              id: mod.id,
              nombre: mod.nombre,
              icono: mod.icono,
              ruta: `./${mod.ruta}`
            };
          });

          Object.keys(modulosEmpresa).forEach((paqueteId) => {
            const subs = modulosEmpresa[paqueteId] || [];

            if (paqueteId === 'ventas' || paqueteId === 'servicios') {
              // Desglosar submódulos individuales que estén ACTIVOS en la BD
              subs.forEach((sub: any) => {
                if (sub.activo) {
                  botonesReales[sub.id] = {
                    id: sub.id,
                    nombre: sub.nombre,
                    icono: ICONO_MODULO[sub.id] || 'fas fa-circle',
                    ruta: `./${RUTA_MODULO[sub.id] || this.slugify(sub.nombre)}`
                  };
                }
              });
            } else if (['rrhh', 'finanzas', 'addons', 'base'].includes(paqueteId)) {
              // Módulo completo: revisar si tiene algún submódulo ACTIVO en la BDÁreal
              const isActivo = subs.some((s: any) => s.activo);
              if (isActivo) {
                let id = paqueteId;
                let nombre = paqueteId === 'rrhh' ? 'Gestión Humana' : (paqueteId === 'finanzas' ? 'Finanzas' : (paqueteId === 'addons' ? 'Addons+' : ''));
                let ruta = `./${this.slugify(nombre)}`;
                if (paqueteId === 'base') {
                  // El paquete 'base' de la BD (Recordatorios, Reuniones, etc.) no genera botón propio
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
      // Si no tiene empresa (caso inusual en cliente), mantener módulos base
      this.aplicarOrdenamiento(botones);
    }
  }

  // Plan según el tipo de empresa
  private calcularPlan(tipoEmpresaUsuario: string): string {
    if (tipoEmpresaUsuario.includes('Ventas y Servicios') || tipoEmpresaUsuario === 'Mixto') return 'Mixto';
    if (tipoEmpresaUsuario === 'Ventas') return 'Ventas';
    if (tipoEmpresaUsuario === 'Servicios') return 'Servicios';
    return 'Especial';
  }

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

  private aplicarOrdenamiento(botones: { [key: string]: ModuloSidebar }) {
    // Si la empresa tiene Gestión de Clientes (s_crm) pero no Clientes (v_cxc) [Empresas de Servicios],
    // inyectamos el botón de Clientes para que puedan acceder al CRM unificado.
    if (botones['s_crm'] && !botones['v_cxc']) {
      botones['v_cxc'] = {
        id: 'v_cxc',
        nombre: 'Clientes',
        icono: 'fas fa-address-book',
        ruta: './clientes'
      };
    }

    // Renombramos 's_cat' a 'Servicios' para unificar los submódulos.
    if (botones['s_cat']) {
      botones['s_cat'].nombre = 'Servicios';
    }

    const ordenDeseado = [
      'd_ini', // Inicio
      'd_adm', // Administración
      'd_tar', // Gestión de TÁreas
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
      // 1. Inicio ('d_ini') y Autogestión ('d_aut') son Abiertos para TODOS los empleados siempre
      if (id === 'd_ini' || id === 'd_aut') {
        if (botones[id]) itemsOrdenados.push(botones[id]);
        return;
      }

      // 2. Usuarios recién creados NO formalizados (cáscara): SOLO Inicio ('d_ini') y Autogestión ('d_aut')
      if (!esFormalizado) {
        return;
      }

      // 3. Gerente General o Auditor: Acceso total a todos los módulos habilitados de la empresa
      if (esGerente) {
        if (botones[id]) itemsOrdenados.push(botones[id]);
        return;
      }

      // 4. Gestiva IA y Administración: solo Gerente
      if (id === 'd_gia' || id === 'd_adm') {
        return;
      }

      // 5. Si el empleado tiene modulos_permitidos personalizados en su perfil:
      //    MOSTRAR ÚNICAMENTE LOS MÓDULOS ACTIVOS EN modulos_permitidos (ignorar área por defecto)
      if (parsedMods && Object.keys(parsedMods).length > 0) {
        if (parsedMods[id] && botones[id]) {
          itemsOrdenados.push(botones[id]);
        }
        return;
      }

      // 6. Si es Jefe de RRHH (sin modulos_permitidos personalizados)
      if (esJefeRRHH) {
        if (['rrhh', 'd_for', 'd_tar'].includes(id) && botones[id]) {
          itemsOrdenados.push(botones[id]);
        }
        return;
      }

      // 7. Si NO tiene modulos_permitidos personalizados: Filtrar por Área Organizacional estrictamente
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

  private checkModuloCustom(modsPermitidos: any, modId: string): boolean {
    if (!modsPermitidos) return false;
    if (Array.isArray(modsPermitidos)) return modsPermitidos.includes(modId);
    if (typeof modsPermitidos === 'object') return !!modsPermitidos[modId];
    return false;
  }


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

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleNotification() {
    this.hasNotification = !this.hasNotification;
  }

  toggleDaltonism(): void {
    const current = this.accessibilityService.currentMode();
    const modes: ('normal' | 'protanopia' | 'deuteranopia' | 'tritanopia')[] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia'];
    const currentIndex = modes.indexOf(current);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.accessibilityService.setMode(modes[nextIndex]);
  }

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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
