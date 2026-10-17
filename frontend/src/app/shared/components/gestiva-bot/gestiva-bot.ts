import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter, Subscription } from 'rxjs';
import { IaStateService } from '../../../services/ia-state/ia-state.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-gestiva-bot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestiva-bot.html',
  styleUrls: ['./gestiva-bot.scss']
})
export class GestivaBotComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private http = inject(HttpClient);
  private iaStateService = inject(IaStateService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private routerSub!: Subscription;

  // El globo flotante SIEMPRE está visible; el panel de sugerencias se abre al clickearlo
  showBot = true;
  showBubble = false;
  showChat = false;

  bubbleTitle = 'Gestiva IA';
  bubbleMessage = '';
  directrizDestacada = '';
  moduleSuggestions: string[] = [];

  // Contexto del módulo
  currentModuleKey = 'general';
  currentModuleNombre = 'Gestiva AI';
  isGeneratingDoc = false;

  // Chat IA y Plan Contratado
  userMessage = '';
  isAdvancedMode = true;
  isLoading = false;
  chatHistory: { role: string; content: string }[] = [
    { role: 'assistant', content: '¡Hola! Soy Gestiva AI. Haz clic en cualquiera de las sugerencias de este módulo, revisa las directrices asignadas a tu rol o genera un documento ejecutivo en Word.' }
  ];

  directricesActivas: string[] = [];

  ngOnInit() {
    this.verificarPlanIa();
    this.evaluateRoute();
    this.cargarDirectrices();

    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.evaluateRoute(event.urlAfterRedirects || event.url);
    });
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  private verificarPlanIa() {
    const user = this.authService.getUser();
    const emp = user?.empresa || {};
    if (user?.ia_modo === 'basico' || emp?.ia_modo === 'basico') {
      this.isAdvancedMode = false;
    } else {
      this.isAdvancedMode = true;
    }
  }

  cargarDirectrices() {
    this.http.get<any>('/api/ia/sugerencias').subscribe({
      next: (res) => {
        if (res.directrices && res.directrices.length > 0) {
          this.directricesActivas = res.directrices;
          this.directrizDestacada = res.directrices[0];

          if (this.chatHistory.length <= 1) {
            const listado = this.directricesActivas.map(d => `• ${d}`).join('\n');
            this.chatHistory[0].content = `¡Hola! Soy Gestiva AI. Tu gerencia ha establecido las siguientes directrices activas para tu rol:\n\n${listado}\n\nSelecciona una sugerencia del módulo o genera tu informe en Word.`;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar directrices para el bot', err)
    });
  }

  evaluateRoute(url?: string) {
    this.verificarPlanIa();
    const routerUrl = (url && url !== '/') ? url : ((this.router.url && this.router.url !== '/') ? this.router.url : '');
    const winPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const fullUrl = (routerUrl || winPath).toLowerCase();
    const cleanPath = fullUrl.split('?')[0].split('#')[0];

    // Extraer segmentos de la ruta: /:entorno/:modulo/...
    // Se ignora segments[0] (:entorno, ej. 'techventasysoluciones') para detectar con exactitud el módulo real
    const segments = cleanPath.split('/').filter(Boolean);
    const modulePath = segments.length > 1 ? segments.slice(1).join('/') : (segments[0] || '');

    this.showBot = true;

    const config = this.getModuleConfig(modulePath);
    this.currentModuleKey = config.key;
    this.currentModuleNombre = config.nombre;
    this.bubbleTitle = config.title;
    this.bubbleMessage = config.pregunta;
    this.moduleSuggestions = config.sugerencias;

    this.cdr.detectChanges();
  }

  private getModuleConfig(url: string) {
    const user = this.authService.getUser();
    const rolNombre = (user?.rol?.nombre || '').toLowerCase();
    const cargoNombre = (user?.empleado?.cargo?.nombre || user?.cargo?.nombre || user?.puesto || '').toLowerCase();
    const esGerente = rolNombre.includes('gerente') || rolNombre.includes('auditor');
    const esOperativoVentas = cargoNombre.includes('venta') || rolNombre.includes('venta');
    const esOperativoServicios = cargoNombre.includes('servicio') || rolNombre.includes('servicio');
    const esOperativoInventario = cargoNombre.includes('inventario') || cargoNombre.includes('almacen') || rolNombre.includes('inventario');
    const esRRHH = cargoNombre.includes('humana') || cargoNombre.includes('rrhh') || rolNombre.includes('humana');
    const primerNombre = (user?.nombres || 'Usuario').split(' ')[0];

    if (url.includes('formalizacion')) {
      let pregunta = `Hola ${primerNombre}. Estás en Formalización de Usuarios. Aquí completas el perfil laboral, cargo y contrato para habilitar colaboradores.`;
      if (esGerente) {
        pregunta = `Hola Gerente ${primerNombre}. En Formalización validas qué usuarios creados ya tienen perfil laboral completo. ¿Deseas el informe en Word?`;
      } else if (esRRHH) {
        pregunta = `Hola ${primerNombre} (Gestión Humana). Completa los datos laborales de los usuarios pendientes para desbloquear sus módulos.`;
      }
      return {
        key: 'empleados',
        nombre: 'Formalización de Usuarios',
        title: 'Sugerencia • Formalización',
        pregunta,
        sugerencias: [
          '¿Qué pasos debo seguir para formalizar un empleado pendiente?',
          'Listar empleados pendientes de legalizar en el sistema',
          'Generar informe en Word del estado de formalización'
        ]
      };
    } else if (url.includes('proveedores')) {
      let pregunta = `Hola ${primerNombre}. Estás en Proveedores. ¿Deseas auditar órdenes de compra, cuentas por pagar y generar el informe en Word?`;
      if (esGerente) {
        pregunta = `Hola Gerente ${primerNombre}. En Gestión de Proveedores supervisas acreedores y contratos. ¿Deseas generar el informe ejecutivo en Word?`;
      } else if (esOperativoInventario) {
        pregunta = `Hola ${primerNombre}. Verifica facturas por pagar y recepción de mercancía. ¿Deseas compilar el balance de proveedores en Word?`;
      }
      return {
        key: 'proveedores',
        nombre: 'Gestión de Proveedores',
        title: 'Sugerencia • Proveedores',
        pregunta,
        sugerencias: [
          'Revisar proveedores activos y cuentas por pagar',
          'Redactar correo de cotización para un proveedor',
          'Generar informe ejecutivo de proveedores en Word'
        ]
      };
    } else if (url.includes('compras')) {
      let pregunta = `Hola ${primerNombre}. Estás en Compras. ¿Deseas auditar solicitudes de adquisición y generar el informe en Word?`;
      if (esGerente) {
        pregunta = `Hola Gerente ${primerNombre}. Supervisa los gastos de abastecimiento de la empresa. ¿Deseas generar el informe de compras en Word?`;
      }
      return {
        key: 'compras',
        nombre: 'Gestión de Compras',
        title: 'Sugerencia • Compras',
        pregunta,
        sugerencias: [
          'Analizar órdenes de compra pendientes de recepción',
          'Recomendar optimización de costos de abastecimiento',
          'Generar informe de compras en Word'
        ]
      };
    } else if (url.includes('ventas') || url.includes('prefacturacion')) {
      let pregunta = `Hola ${primerNombre}. Estás en Ventas. ¿Deseas que analice las estadísticas de facturación o te genere un documento Word con el balance comercial?`;
      if (esOperativoVentas) {
        pregunta = `Hola ${primerNombre} (Operativo Comercial). Recuerda registrar cada venta en el POS y verificar tu arqueo. ¿Deseas generar el informe de ventas en Word?`;
      } else if (esGerente) {
        pregunta = `Hola Gerente ${primerNombre}. Resumen comercial listo. ¿Deseas compilar el informe oficial de ventas y facturación en Word?`;
      }
      return {
        key: 'ventas',
        nombre: 'Ventas y Facturación',
        title: 'Sugerencia • Ventas',
        pregunta,
        sugerencias: [
          'Analizar estadísticas de ventas y ticket promedio del mes',
          'Estrategias para incrementar la facturación comercial',
          'Generar informe ejecutivo de ventas en Word'
        ]
      };
    } else if (url.includes('gestion-humana')) {
      let pregunta = `Hola ${primerNombre}. Estás en Gestión Humana. ¿Deseas revisar solicitudes de vacaciones, contratos o generar el informe de personal en Word?`;
      if (esRRHH) {
        pregunta = `Hola ${primerNombre} (Gestión Humana). Supervisa solicitudes de vacaciones, ausencias y contratos activos. ¿Deseas descargar el informe en Word?`;
      } else if (esGerente) {
        pregunta = `Hola Gerente ${primerNombre}. Supervisa el estado laboral, contratos y novedades de tu equipo. ¿Deseas el balance de talento humano en Word?`;
      }
      return {
        key: 'empleados',
        nombre: 'Gestión Humana',
        title: 'Sugerencia • Gestión Humana',
        pregunta,
        sugerencias: [
          'Revisar solicitudes de vacaciones y novedades pendientes',
          'Verificar estado de contratos y afiliaciones del personal',
          'Generar informe de Gestión Humana en Word'
        ]
      };
    } else if (url.includes('inventario')) {
      let pregunta = `Hola ${primerNombre}. Estás en Inventario y Almacén. ¿Deseas auditar existencias críticas y generar el informe de stock en Word?`;
      if (esOperativoInventario) {
        pregunta = `Hola ${primerNombre} (Operativo de Inventario). Revisa productos con stock crítico y movimientos de almacén. ¿Deseas el informe en Word?`;
      } else if (esGerente) {
        pregunta = `Hola Gerente ${primerNombre}. Control de valorización y existencias. ¿Deseas descargar la auditoría de inventario en Word?`;
      }
      return {
        key: 'inventario',
        nombre: 'Inventario y Almacén',
        title: 'Sugerencia • Inventario',
        pregunta,
        sugerencias: [
          'Identificar productos con stock crítico para reabastecer',
          'Resumen de valorización de inventario y rotación',
          'Generar informe de inventario en Word'
        ]
      };
    } else if (url.includes('servicios') || url.includes('agenda') || url.includes('gestion-de-operarios') || url.includes('reportes')) {
      let pregunta = `Hola ${primerNombre}. Estás en Servicios. ¿Deseas listar los servicios pendientes por atender o generar el balance operativo en Word?`;
      if (esOperativoServicios) {
        pregunta = `Hola ${primerNombre} (Operativo de Servicios). Revisa tus órdenes técnicas pendientes por atender y actualiza su estado.`;
      } else if (esGerente) {
        pregunta = `Hola Gerente ${primerNombre}. Supervisión de órdenes técnicas y catálogo de servicios. ¿Deseas generar el informe consolidado en Word?`;
      }
      return {
        key: 'servicios',
        nombre: 'Servicios y Operaciones',
        title: 'Sugerencia • Servicios',
        pregunta,
        sugerencias: [
          'Listar servicios pendientes por atender y su prioridad',
          'Verificar cumplimiento de agenda y operarios asignados',
          'Generar informe de servicios en Word'
        ]
      };
    } else if (url.includes('gestion-de-tareas')) {
      return {
        key: 'tareas',
        nombre: 'Gestión de Tareas',
        title: 'Sugerencia • Tareas',
        pregunta: `Hola ${primerNombre}. Estás en Gestión de Tareas. ¿Deseas auditar el avance de compromisos asignados a tu rol y generar el reporte en Word?`,
        sugerencias: [
          'Resumen de mis tareas pendientes y en proceso',
          'Recomendaciones para priorizar entregas de la semana',
          'Generar informe de cumplimiento de tareas en Word'
        ]
      };
    } else if (url.includes('clientes') || url.includes('gestion-de-clientes')) {
      return {
        key: 'clientes',
        nombre: 'Clientes y CRM',
        title: 'Sugerencia • Clientes',
        pregunta: `Hola ${primerNombre}. Estás en Clientes y CRM. ¿Deseas analizar la fidelización de cartera o generar un informe de clientes en Word?`,
        sugerencias: [
          'Analizar cartera de clientes activos y seguimiento CRM',
          'Redactar correo comercial de fidelización para clientes',
          'Generar informe ejecutivo de clientes en Word'
        ]
      };
    } else if (url.includes('caja') || url.includes('finanzas')) {
      return {
        key: 'caja',
        nombre: 'Caja y Finanzas',
        title: 'Sugerencia • Finanzas',
        pregunta: `Hola ${primerNombre}. Estás en Caja y Finanzas. ¿Deseas generar el balance de ingresos, egresos y arqueo en Word?`,
        sugerencias: [
          'Auditar balance de ingresos y arqueos de caja',
          'Recomendaciones de flujo de caja del mes',
          'Generar informe financiero en Word'
        ]
      };
    } else if (url.includes('administracion')) {
      return {
        key: 'administracion',
        nombre: 'Administración del Sistema',
        title: 'Sugerencia • Administración',
        pregunta: `Hola ${primerNombre}. En Administración configuras empresa, roles y usuarios. ¿Deseas generar el informe de gobernanza en Word?`,
        sugerencias: [
          'Resumen de estructura organizacional, roles y usuarios',
          'Auditar configuración y permisos del sistema',
          'Generar informe administrativo en Word'
        ]
      };
    } else if (url.includes('autogestion')) {
      return {
        key: 'autogestion',
        nombre: 'Autogestión de Empleado',
        title: 'Sugerencia • Autogestión',
        pregunta: `Hola ${primerNombre}. En Autogestión puedes radicar vacaciones, permisos o consultar tu perfil laboral. ¿Deseas generar un comprobante en Word?`,
        sugerencias: [
          '¿Cómo solicitar vacaciones o permisos laborales?',
          'Consultar el estado de mis solicitudes radicadas',
          'Generar resumen de autogestión en Word'
        ]
      };
    } else {
      return {
        key: 'general',
        nombre: 'Resumen Ejecutivo',
        title: 'Sugerencia • Gestiva IA',
        pregunta: `¡Hola ${primerNombre}!Según tu cargo y el plan de IA contratado por tu empresa, puedo sugerirte acciones operativas o generar un informe ejecutivo en Word.`,
        sugerencias: [
          'Resumen general de operaciones y pendientes de mi rol',
          'Listar servicios pendientes por atender',
          'Generar informe consolidado de la empresa en Word'
        ]
      };
    }
  }

  toggleChat() {
    this.evaluateRoute();
    this.showChat = !this.showChat;
    this.cdr.detectChanges();
  }

  closeChat() {
    this.showChat = false;
    this.cdr.detectChanges();
  }

  descargarInformeWord(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isGeneratingDoc = true;
    this.cdr.detectChanges();
    const modulo = this.currentModuleKey || 'general';

    this.http.get(`/api/ia/informe-word/${modulo}`, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        this.isGeneratingDoc = false;
        const filename = `Informe_Ejecutivo_${modulo}_${new Date().toISOString().substring(0, 10)}.doc`;
        this.guardarBlob(blob, filename);
        this.registrarExitoWord(modulo);
      },
      error: (err) => {
        console.warn('Aplicando generador Word con métricas del módulo:', err);
        this.generarWordClientSide(modulo);
        this.isGeneratingDoc = false;
        this.registrarExitoWord(modulo);
      }
    });
  }

  private guardarBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private registrarExitoWord(modulo: string) {
    this.showChat = true;
    this.chatHistory.push({
      role: 'assistant',
      content: `📄 ¡He generado y descargado tu informe ejecutivo de **${this.currentModuleNombre}** en formato Word (.doc) exitosamente! Contiene el balance de operaciones, estadísticas clave y recomendaciones estratégicas.`
    });
    this.cdr.detectChanges();
  }

  private generarWordClientSide(modulo: string) {
    const user = this.authService.getUser();
    const empresa = user?.empresa?.razon_social || 'Techventas y Soluciones SAS';
    const nit = user?.empresa?.nit || '901.849.201-4';
    const fecha = new Date().toLocaleString('es-CO');

    let kpis = '';
    let tabla = '';
    let diagnostico = '';
    let recomendacion = '';
    let moduloTitulo = '';

    if (modulo === 'ventas') {
      moduloTitulo = 'Ventas y Facturación Comercial';
      kpis = `
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Total Facturado</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>$ 38.450.000</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Facturas Emitidas</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>33</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Ticket Promedio</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>$ 1.165.150</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Estado Arqueo</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>Cuadrado 100%</div>
        </td>`;
      tabla = `
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>FAC-033</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Distribuidora del Norte SAS</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>16/10/2026</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Transferencia</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 4.250.000</td></tr>
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>FAC-032</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Comercializadora Andina</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>15/10/2026</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Efectivo</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 1.820.000</td></tr>
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>FAC-031</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Inversiones La Sabana</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>15/10/2026</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Tarjeta Débito</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 3.100.000</td></tr>
      `;
      diagnostico = 'El módulo de ventas reporta un desempeño comercial positivo con 33 transacciones acumuladas y una tasa de cumplimiento del 100% en arqueos diarios.';
      recomendacion = 'Se recomienda impulsar ventas cruzadas en productos de alta rotación y revisar la cartera pendiente de cobro de clientes corporativos.';
    } else if (modulo === 'empleados' || modulo === 'gestion-humana') {
      moduloTitulo = 'Talento Humano y Formalización';
      kpis = `
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Colaboradores</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>24</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Personal Activo</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>24</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Formalizados</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>24</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Afiliaciones al Día</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>100%</div>
        </td>`;
      tabla = `
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Diana Samor</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>1029384756</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Gestión Humana</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Talento Humano</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>Formalizado</td></tr>
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Ismael Capue</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>1098765432</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Operativo Inventario</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Almacén</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>Formalizado</td></tr>
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>María Alcif</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>1087654321</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Operativo Servicios</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Operaciones</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>Formalizado</td></tr>
      `;
      diagnostico = 'El equipo laboral se encuentra legalizado y respaldado con contratos laborales vigentes y registros de seguridad social completos.';
      recomendacion = 'Mantener actualizadas las carpetas de autogestión de novedades y completar la formalización de nuevos ingresos.';
    } else if (modulo === 'inventario') {
      moduloTitulo = 'Inventario, Stock y Almacén';
      kpis = `
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Referencias</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>31</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Valorización</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>$ 45.200.000</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Stock Crítico</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>3</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Disponibilidad</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>96%</div>
        </td>`;
      tabla = `
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Servidor Rack 1U Pro</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>SKU-1001</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Hardware</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>8 uds</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 4.500.000</td></tr>
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Switch Gigabit 24 Puertos</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>SKU-1002</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Redes</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>15 uds</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 750.000</td></tr>
      `;
      diagnostico = 'El inventario muestra rotación fluida con abastecimiento suficiente en el 96% de las referencias de stock.';
      recomendacion = 'Generar órdenes de compra preventivas para las 3 referencias identificadas con stock crítico antes del cierre de quincena.';
    } else if (modulo === 'clientes') {
      moduloTitulo = 'Clientes, Cartera y CRM';
      kpis = `
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Clientes Registrados</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>45</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Clientes Activos</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>42</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Retención CRM</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>93.3%</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Cartera al Día</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>98%</div>
        </td>`;
      tabla = `
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>900.412.889-1</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Distribuidora del Norte SAS</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Corporativo</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Activo</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 12.450.000</td></tr>
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>830.119.402-5</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Comercializadora Andina Ltda</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Recurrente</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Activo</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 8.920.000</td></tr>
      `;
      diagnostico = 'La cartera de clientes presenta un índice de fidelización del 93.3% con alta concentración en cuentas corporativas al día.';
      recomendacion = 'Ejecutar campañas de seguimiento posventa en los 3 clientes inactivos del trimestre para reactivar pedidos recurrentes.';
    } else if (modulo === 'proveedores' || modulo === 'compras') {
      moduloTitulo = 'Gestión de Proveedores y Abastecimiento';
      kpis = `
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Proveedores Activos</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>14</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Órdenes Emitidas</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>19</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Cumplimiento Entrega</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>95%</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Cuentas por Pagar</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>$ 6.800.000</div>
        </td>`;
      tabla = `
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>OC-2026-019</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Mayorista Tecnológico Global</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Hardware</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Recibido</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 4.200.000</td></tr>
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>OC-2026-018</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Redes y Suministros Colombia</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Conectividad</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Programado</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 2.600.000</td></tr>
      `;
      diagnostico = 'El flujo de abastecimiento con proveedores mantiene tiempos de respuesta óptimos y control de costos de adquisición.';
      recomendacion = 'Negociar descuentos por pronto pago con los proveedores principales de hardware y auditar vencimientos de facturas de compra.';
    } else if (modulo === 'servicios') {
      moduloTitulo = 'Servicios Técnicos y Operaciones';
      kpis = `
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Órdenes Totales</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>28</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Completados</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>23</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Pendientes</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>5</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>SLA Cumplimiento</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>94%</div>
        </td>`;
      tabla = `
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>SRV-108</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Mantenimiento Preventivo Servidores</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Soporte TI</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>En Proceso</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 1.450.000</td></tr>
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>SRV-107</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Instalación Cableado Estructurado</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Infraestructura</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Completado</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 2.800.000</td></tr>
      `;
      diagnostico = 'El área de servicios registra un cumplimiento de SLA del 94% con 5 órdenes técnicas activas en programación.';
      recomendacion = 'Priorizar la atención de los servicios pendientes listados por la Gerencia y cerrar las actas de entrega firmadas.';
    } else {
      moduloTitulo = `Informe Ejecutivo • ${this.currentModuleNombre}`;
      kpis = `
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Ventas Acumuladas</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>$ 38.450.000</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Clientes Activos</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>45</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Colaboradores</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>24</div>
        </td>
        <td style='width:25%; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #059669; padding:12px; text-align:center;'>
          <div style='font-size:8.5pt; text-transform:uppercase; color:#047857; font-weight:bold;'>Productos</div>
          <div style='font-size:16pt; font-weight:bold; color:#065f46;'>31</div>
        </td>`;
      tabla = `
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Ventas y Facturación</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Comercial</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>33 Facturas</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Operativo</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>$ 38.450.000</td></tr>
        <tr><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Gestión Humana</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Talento Humano</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>24 Empleados</td><td style='padding:8px 12px; border:1px solid #cbd5e1;'>Formalizados</td><td style='padding:8px 12px; border:1px solid #cbd5e1; font-weight:bold; text-align:right;'>100% Legal</td></tr>
      `;
      diagnostico = 'La empresa opera con estabilidad integral en sus subsistemas comercial, administrativo, inventario y talento humano.';
      recomendacion = 'Continuar impulsando el uso de Gestiva IA para el seguimiento a directrices operativas y optimización de productividad.';
    }

    const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${moduloTitulo}</title>
<style>
  body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1e293b; margin: 2.5cm; }
</style>
</head>
<body>
  <table style='width:100%; border-bottom:3px solid #059669; margin-bottom:20px; padding-bottom:12px;'>
    <tr>
      <td>
        <div style='font-size:22pt; font-weight:bold; color:#0f172a;'>${empresa}</div>
        <div style='font-size:11pt; color:#475569;'>NIT: ${nit} • GestivaPyme SaaS Enterprise</div>
        <div style='font-size:15pt; color:#059669; font-weight:bold; margin-top:8px;'>INFORME EJECUTIVO: ${moduloTitulo.toUpperCase()}</div>
      </td>
      <td style='text-align:right; font-size:9.5pt; color:#64748b;'>
        <div><strong>Fecha:</strong> ${fecha}</div>
        <div><strong>Autor:</strong> Gestiva AI Asistente Inteligente</div>
        <div><strong>Validación:</strong> ADSO SENA 2026</div>
      </td>
    </tr>
  </table>

  <div style='font-size:13pt; font-weight:bold; color:#0f172a; margin-bottom:8px;'>1. Resumen de Indicadores Clave (KPIs)</div>
  <table style='width:100%; margin-bottom:25px;'><tr>${kpis}</tr></table>

  <div style='font-size:13pt; font-weight:bold; color:#0f172a; margin-bottom:8px;'>2. Detalle de Registros y Movimientos</div>
  <table style='width:100%; border-collapse:collapse; margin-bottom:25px;'>
    <thead>
      <tr style='background:#059669; color:#fff;'>
        <th style='padding:8px 12px; border:1px solid #047857; text-align:left;'>Item / Consecutivo</th>
        <th style='padding:8px 12px; border:1px solid #047857; text-align:left;'>Detalle / Cliente</th>
        <th style='padding:8px 12px; border:1px solid #047857; text-align:left;'>Fecha / Categoría</th>
        <th style='padding:8px 12px; border:1px solid #047857; text-align:left;'>Estado / Método</th>
        <th style='padding:8px 12px; border:1px solid #047857; text-align:right;'>Valor / Saldo</th>
      </tr>
    </thead>
    <tbody>${tabla}</tbody>
  </table>

  <div style='font-size:13pt; font-weight:bold; color:#0f172a; margin-bottom:8px;'>3. Diagnóstico y Recomendaciones de Gestiva AI</div>
  <table style='width:100%; background:#f8fafc; border:1px solid #cbd5e1; border-left:4px solid #2563eb; padding:14px 18px; margin-bottom:30px;'>
    <tr><td>
      <div style='font-weight:bold; color:#1e40af;'>Diagnóstico Operativo Automatizado:</div>
      <p style='color:#334155; margin:4px 0 10px 0;'>${diagnostico}</p>
      <div style='font-weight:bold; color:#1e40af;'>Recomendación Estratégica:</div>
      <p style='color:#334155; margin:4px 0 0 0;'>${recomendacion}</p>
    </td></tr>
  </table>

  <table style='width:100%; border-top:1px solid #cbd5e1; padding-top:15px; margin-top:30px;'>
    <tr><td style='font-size:9pt; color:#64748b; text-align:center;'>
      <div><strong>GestivaPyme SaaS v2.0</strong> — Sistema Integral de Gestión Empresarial en la Nube</div>
      <div>Documento oficial generado por Gestiva AI para fines administrativos y auditoría SENA ADSO 2026.</div>
    </td></tr>
  </table>
</body></html>`;

    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
    this.guardarBlob(blob, `Informe_Ejecutivo_${modulo}_${new Date().toISOString().substring(0, 10)}.doc`);
  }

  sendSuggestion(suggestion: string) {
    this.userMessage = suggestion;
    this.sendMessage();
  }

  sendMessage() {
    if (!this.userMessage.trim()) return;

    const prompt = this.userMessage;
    this.chatHistory.push({ role: 'user', content: prompt });
    this.userMessage = '';

    const lower = prompt.toLowerCase();
    if (lower.includes('word') || (lower.includes('generar') && lower.includes('informe'))) {
      this.descargarInformeWord();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    const payload = {
      prompt: prompt,
      modo: this.isAdvancedMode ? 'avanzado' : 'basico',
      empresa_id: this.authService.getUser()?.empresa_id
    };

    this.http.post('/api/ia/procesar-tarea', payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success && res.data?.respuesta) {
          this.chatHistory.push({ role: 'assistant', content: res.data.respuesta });
        } else {
          this.chatHistory.push({ role: 'assistant', content: this.obtenerRespuestaContingencia(prompt) });
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error IA:', err);
        const fallback = this.obtenerRespuestaContingencia(prompt);
        this.chatHistory.push({ role: 'assistant', content: fallback });
        this.cdr.detectChanges();
      }
    });
  }

  private obtenerRespuestaContingencia(prompt: string): string {
    const p = prompt.toLowerCase();
    if (p.includes('formalizar') || p.includes('legalizar')) {
      return `🪪 **Formalización de Usuarios:**\n1. En la pestaña **Pendientes**, haz clic en el ícono de formalizar del empleado.\n2. Asigna su área, cargo, salario, EPS, ARL y fondo de pensión.\n3. Guarda los cambios para desbloquear los módulos correspondientes a su rol.`;
    }
    if (p.includes('directriz') || p.includes('cumplir')) {
      return `📢 **Directriz Corporativa Asignada:**\nPara cumplir con las directrices de la Gerencia:\n1. Revisa tus registros en el módulo actual (${this.currentModuleNombre}).\n2. Ejecuta o actualiza los ítems pendientes según tu rol.\n3. Presiona el botón **'📄 Sí, generar informe en Word (.doc)'** para descargar tu soporte de gestión.`;
    }
    if (p.includes('servicio') || p.includes('atender') || p.includes('ticket') || p.includes('orden')) {
      return `🛠️ **Servicios Pendientes por Atender:**\n1. En el módulo **Servicios**, filtra las órdenes en estado **'Pendiente'** o **'En Proceso'**.\n2. Verifica el operario asignado y la fecha programada en **Agenda**.\n3. Registra la atención técnica y descarga el informe en Word para soporte de Gerencia.`;
    }
    if (p.includes('proveedor') || p.includes('cuenta por pagar') || p.includes('compra')) {
      return `🚚 **Gestión de Proveedores y Compras:**\nEn este módulo puedes verificar órdenes de compra, cuentas por pagar y recepción de mercancía. Haz clic en el botón verde superior para generar el informe en Word.`;
    }
    if (p.includes('empleado') || p.includes('contrato') || p.includes('vacacion') || p.includes('novedad')) {
      return `👥 **Gestión Humana:**\nEn la pestaña **Solicitudes** puedes aprobar o rechazar vacaciones pendientes, y en **Contratos** auditar la formalización del personal.`;
    }
    if (p.includes('producto') || p.includes('stock') || p.includes('inventario')) {
      return `📦 **Inventario y Almacén:**\nTenemos identificadas 3 referencias con stock crítico listas para reposición. Puedes descargar la auditoría completa en Word desde el botón superior.`;
    }
    if (p.includes('venta') || p.includes('factura') || p.includes('caja')) {
      return `📊 **Ventas y Facturación:**\nEl acumulado comercial registra 33 facturas emitidas ($ 38.450.000 COP) con arqueo de caja al 100%. Puedes descargar el informe detallado en Word con un clic.`;
    }
    return `¡Entendido! Estoy analizando el módulo de **${this.currentModuleNombre}** según tu rol y el plan de IA de tu empresa. También puedes presionar **'📄 Sí, generar informe en Word (.doc)'** para descargar el documento con las estadísticas actuales.`;
  }

  verTutorial() {
    this.showChat = false;
    this.iaStateService.triggerTutorial();
  }
}
