import { VolverDirective } from '../../../../../shared/directives/volver.directive';
import { Component, OnInit, inject, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteService, Cliente, Historial360Response } from '../../../../../services/cliente.service';
import { ToastService } from '../../../../../services/toast.service';
import { SolicitudInactivacionComponent } from '../../../../../shared/components/solicitud-inactivacion/solicitud-inactivacion.component';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-crm-gestion-de-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, SolicitudInactivacionComponent, VolverDirective],
  templateUrl: './crm-gestion-de-clientes.component.html',
  styleUrl: './crm-gestion-de-clientes.component.scss'
})
export class CrmGestionDeClientesComponent implements OnInit {
  // --- PROPIEDADES DE ENTRADA ---
  @Input() isEmbedded: boolean = false;
  @Input() clienteInicial: any = null;

  // --- SERVICIOS INYECTADOS ---
  private cdr = inject(ChangeDetectorRef);
  private clienteService = inject(ClienteService);
  private toast = inject(ToastService);

  // --- VARIABLES DE ESTADO ---
  clientes: Cliente[] = [];
  resultados: Cliente[] = [];
  busqueda: string = '';
  buscando: boolean = false;
  cargando360: boolean = false;
  
  clienteSeleccionado: Cliente | null = null;
  historial360: Historial360Response | null = null;
  subTab360: 'timeline' | 'ventas' | 'cotizaciones' | 'servicios' = 'timeline';

  pageSize = 8;
  pageResultados = 1;

  // --- GETTERS Y PAGINACION ---
  get paginatedResultados(): Cliente[] {
    const start = (this.pageResultados - 1) * this.pageSize;
    return this.resultados.slice(start, start + this.pageSize);
  }

  get totalPagesResultados(): number {
    return Math.ceil(this.resultados.length / this.pageSize) || 1;
  }

  // Bloque de ciclo de vida OnInit para cargar clientes
  ngOnInit() {
    this.cargarClientes();
  }

  // Bloque para cargar el listado de clientes desde la API
  cargarClientes() {
    this.clienteService.getClientes().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.clientes = res;
        this.resultados = res;
        if (this.clienteInicial) {
          const targetDoc = (this.clienteInicial.documento || '').toLowerCase();
          const targetNom = (this.clienteInicial.nombre_razon_social || this.clienteInicial.nombres || '').toLowerCase();
          const found = this.clientes.find(c => 
            (c.id && c.id === this.clienteInicial.id) ||
            (c.documento && c.documento.toLowerCase() === targetDoc) ||
            (c.nombres && c.nombres.toLowerCase().includes(targetNom))
          );
          if (found) {
            this.seleccionarCliente(found);
          } else {
            this.seleccionarCliente(this.clienteInicial);
          }
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.clientes = [];
        this.resultados = [];
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para realizar la búsqueda en tiempo real de clientes
  buscar() {
    this.buscando = true;
    this.pageResultados = 1;
    const q = this.busqueda.trim().toLowerCase();
    if (!q) {
      this.resultados = this.clientes;
    } else {
      this.resultados = this.clientes.filter(c =>
        (c.nombres?.toLowerCase().includes(q)) ||
        (c.nombre_razon_social?.toLowerCase().includes(q)) ||
        (c.documento?.toLowerCase().includes(q)) ||
        (c.ciudad?.toLowerCase().includes(q)) ||
        (c.email?.toLowerCase().includes(q))
      );
    }
    this.buscando = false;
  }

  // Bloque para seleccionar un cliente y cargar su ficha 360
  seleccionarCliente(cliente: Cliente) {
    this.clienteSeleccionado = cliente;
    this.cargarHistorial360(cliente);
  }

  // Bloque para consultar el historial unificado 360 del cliente
  cargarHistorial360(cliente: Cliente) {
    if (!cliente.id) return;
    this.cargando360 = true;
    this.clienteService.getHistorial360(cliente.id).pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.historial360 = res;
        this.cargando360 = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Error al cargar la vista 360° del cliente');
        this.historial360 = null;
        this.cargando360 = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque utilitario para obtener el nombre legible del cliente
  nombreCliente(cliente: Cliente): string {
    if (!cliente) return '--';
    if (cliente.nombre_razon_social && cliente.nombre_razon_social.trim()) {
      return cliente.nombre_razon_social.trim();
    }
    const partes = [cliente.nombres, cliente.apellidos].filter(p => p && p !== 'null' && p.trim());
    if (partes.length > 0) return partes.join(' ');
    return cliente.email || '--';
  }

  // Bloque utilitario para formatear el número de documento con su prefijo
  getDocumentoFormateado(c: any): string {
    if (!c || !c.documento) return '--';
    const doc = c.documento.trim();
    const docLower = doc.toLowerCase();
    if (docLower.startsWith('nit') || docLower.startsWith('cc') || docLower.startsWith('ce') || docLower.startsWith('pas')) {
      return doc;
    }
    const prefix = c.tipo_cliente === 'Juridico' ? 'NIT' : 'CC';
    return `${prefix} ${doc}`;
  }

  // Bloque para mapear el estado a una clase visual de badge
  getBadgeEstado(estado: string): string {
    switch (estado) {
      case 'Finalizado':
      case 'Pagado':
      case 'Entregado':
      case 'aprobada':
      case 'facturada':
        return 'badge-success';
      case 'Pendiente':
      case 'enviada':
      case 'En preparación':
      case 'En camino':
        return 'badge-warning';
      case 'Asignado':
      case 'convertida':
        return 'badge-primary';
      case 'En Sitio':
      case 'Recibido':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  // Bloque utilitario para generar estrellas de calificación
  getStarArray(n: number = 5): number[] {
    return Array.from({ length: Math.round(n) }, (_, i) => i + 1);
  }

  // Bloque para orientar al usuario en la creación de visitas técnicas
  nuevaVisita() {
    this.toast.info('Para programar una visita, crea un ticket de servicio en el módulo de Servicios.');
  }
}
