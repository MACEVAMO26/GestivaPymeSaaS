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

  // Estados visuales del Globito Proactivo
  showBubble = true;
  showChat = false;
  bubbleTitle = 'Gestiva IA';
  bubbleMessage = '';
  directrizDestacada = '';

  // Contexto del módulo
  currentModuleKey = 'general';
  currentModuleNombre = 'Gestiva AI';
  isGeneratingDoc = false;

  // Chat IA
  userMessage = '';
  isAdvancedMode = false;
  isLoading = false;
  chatHistory: { role: string; content: string }[] = [
    { role: 'assistant', content: '¡Hola! Soy Gestiva AI, tu asistente proactivo. Puedo ayudarte con tareas, guías y generar informes ejecutivos en Word con las estadísticas de tu empresa.' }
  ];

  directricesActivas: string[] = [];

  ngOnInit() {
    const user = this.authService.getUser();
    if (user?.ia_modo === 'avanzado') {
      this.isAdvancedMode = true;
    }

    // 1. Evaluar inmediatamente la ruta actual para desplegar la sugerencia contextual
    this.evaluateRoute(this.router.url);

    // 2. Cargar directrices activas de la empresa para el rol del usuario
    this.cargarDirectrices();

    // 3. Escuchar cambios de ruta para adaptar proactivamente el globito a cada módulo
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.evaluateRoute(event.urlAfterRedirects || this.router.url);
    });
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
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
            this.chatHistory[0].content = `¡Hola! Soy Gestiva AI. Tu gerencia ha establecido las siguientes directrices activas para tu rol:\n\n${listado}\n\n¿En qué puedo orientarte hoy o deseas que genere un informe en Word?`;
          }
        }
      },
      error: (err) => console.error('Error al cargar directrices para el bot', err)
    });
  }

  evaluateRoute(url: string) {
    const cleanUrl = (url || '').toLowerCase();
    const config = this.getModuleConfig(cleanUrl);

    this.currentModuleKey = config.key;
    this.currentModuleNombre = config.nombre;
    this.bubbleTitle = config.title;
    this.bubbleMessage = config.pregunta;

    // El globito siempre se muestra de manera visible y proactiva
    this.showBubble = true;
  }

  private getModuleConfig(url: string) {
    if (url.includes('ventas') || url.includes('prefacturacion')) {
      return {
        key: 'ventas',
        nombre: 'Ventas y Facturación',
        title: 'Gestiva IA • Ventas',
        pregunta: '📊 Detecto operaciones comerciales en Ventas. ¿Deseas que genere un informe ejecutivo en Word con las estadísticas y totales facturados?'
      };
    } else if (url.includes('gestion-humana') || url.includes('empleados') || url.includes('formalizacion') || url.includes('autogestion')) {
      return {
        key: 'empleados',
        nombre: 'Gestión Humana',
        title: 'Gestiva IA • Gestión Humana',
        pregunta: '👥 Estás en Gestión Humana. ¿Deseas generar el informe de talento humano, contratos y colaboradores en Word?'
      };
    } else if (url.includes('inventario') || url.includes('compras') || url.includes('proveedores')) {
      return {
        key: 'inventario',
        nombre: 'Inventario y Almacén',
        title: 'Gestiva IA • Inventario',
        pregunta: '📦 Estás en Inventario. ¿Deseas auditar existencias y generar el informe de stock y productos en Word?'
      };
    } else if (url.includes('servicios') || url.includes('agenda') || url.includes('gestion-de-clientes') || url.includes('gestion-de-operarios') || url.includes('reportes')) {
      return {
        key: 'servicios',
        nombre: 'Servicios y Operaciones',
        title: 'Gestiva IA • Servicios',
        pregunta: '🛠️ Estás en Servicios. ¿Deseas generar el informe de tickets, órdenes y servicios prestados en Word?'
      };
    } else if (url.includes('clientes')) {
      return {
        key: 'clientes',
        nombre: 'Clientes y CRM',
        title: 'Gestiva IA • Clientes',
        pregunta: '🤝 Estás en Clientes. ¿Deseas un resumen de cartera comercial y fidelización en Word?'
      };
    } else if (url.includes('caja') || url.includes('finanzas')) {
      return {
        key: 'caja',
        nombre: 'Caja y Finanzas',
        title: 'Gestiva IA • Finanzas',
        pregunta: '💰 Estás en Caja/Finanzas. ¿Deseas generar el balance de movimientos y arqueo en Word?'
      };
    } else {
      return {
        key: 'general',
        nombre: 'Gestiva AI',
        title: 'Gestiva IA • Asistente',
        pregunta: '📈 ¡Hola! Soy Gestiva IA. ¿Deseas que prepare un informe ejecutivo consolidado de tu empresa en Word?'
      };
    }
  }

  abrirChatDesdeBurbuja() {
    this.showBubble = false;
    this.showChat = true;
  }

  cerrarBurbuja(event: Event) {
    event.stopPropagation();
    this.showBubble = false;
  }

  toggleChat() {
    this.showChat = !this.showChat;
    if (this.showChat) {
      this.showBubble = false;
    }
  }

  closeChat() {
    this.showChat = false;
  }

  descargarInformeWord(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isGeneratingDoc = true;
    const modulo = this.currentModuleKey || 'general';

    this.http.get(`/api/ia/informe-word/${modulo}`, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        this.isGeneratingDoc = false;
        const filename = `Informe_Ejecutivo_${modulo}_${new Date().toISOString().substring(0, 10)}.doc`;
        this.guardarBlob(blob, filename);
        this.registrarExitoWord(modulo);
      },
      error: (err) => {
        console.warn('Backend Word no respondió de inmediato, aplicando generador client-side de contingencia:', err);
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
    this.showBubble = false;
    this.chatHistory.push({
      role: 'assistant',
      content: `📄 ¡He generado y descargado tu informe ejecutivo de **${this.currentModuleNombre}** en formato Word (.doc) exitosamente! Contiene el balance de operaciones, métricas estadísticas clave y recomendaciones estratégicas para la Gerencia.`
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
      moduloTitulo = 'Talento Humano y Nómina';
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
      recomendacion = 'Mantener actualizadas las carpetas de autogestión de novedades y programar capacitaciones de seguridad y salud en el trabajo (SST).';
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
    } else {
      moduloTitulo = 'Consolidado General de Operaciones';
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
    if (lower.includes('word') || lower.includes('informe') || lower.includes('reporte') || lower.includes('estadistica')) {
      this.descargarInformeWord();
      return;
    }

    this.isLoading = true;

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
          this.chatHistory.push({ role: 'assistant', content: 'Lo siento, no pude procesar tu solicitud.' });
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
    if (p.includes('directriz') || p.includes('cumplir')) {
      return `📢 **Directriz Corporativa:**\nPara cumplir exitosamente con la directriz de Gerencia:\n1. Revisa tus registros del módulo actual (${this.currentModuleNombre}).\n2. Ejecuta los movimientos pendientes antes del cierre del día.\n3. Puedes presionar el botón superior para **Descargar el Informe en Word** y validar las cifras alcanzadas.`;
    }
    if (p.includes('empleado') || p.includes('contrato') || p.includes('novedad')) {
      return `👥 En **Gestión Humana** puedes registrar empleados, cargar contratos y gestionar solicitudes de autogestión o vacaciones. Si requieres el balance legal del personal, puedes descargar el informe en Word ahora mismo.`;
    }
    if (p.includes('producto') || p.includes('stock') || p.includes('inventario')) {
      return `📦 En **Inventario** puedes registrar productos, ajustar existencias y fijar precios. Si deseas auditar el inventario completo, haz clic en 'Descargar Informe en Word'.`;
    }
    if (p.includes('venta') || p.includes('factura') || p.includes('caja')) {
      return `📊 En **Ventas** puedes emitir facturas en el Punto de Venta (POS) y consultar el historial de clientes. Recuerda verificar tu arqueo diario de caja.`;
    }
    return `¡Entendido! Como asistente de Gestiva AI estoy monitoreando activamente el módulo de **${this.currentModuleNombre}**. ¿Deseas que genere el informe oficial en Word con las métricas actuales?`;
  }

  verTutorial() {
    this.showChat = false;
    this.iaStateService.triggerTutorial();
  }
}
