import { Component, OnInit, inject, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteService, Cliente } from '../../../../../services/cliente.service';
import { OperariosTicketsService, ServicioTicket } from '../../../../../services/operarios-tickets.service';
import { ToastService } from '../../../../../services/toast.service';
import { SolicitudInactivacionComponent } from '../../../../../shared/components/solicitud-inactivacion/solicitud-inactivacion.component';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-crm-gestion-de-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, SolicitudInactivacionComponent],
  templateUrl: './crm-gestion-de-clientes.component.html',
  styleUrl: './crm-gestion-de-clientes.component.scss'
})
export class CrmGestionDeClientesComponent implements OnInit {
  @Input() isEmbedded: boolean = false;
  @Input() clienteInicial: any = null;
  private cdr = inject(ChangeDetectorRef);
  private clienteService = inject(ClienteService);
  private ticketsService = inject(OperariosTicketsService);
  private toast = inject(ToastService);

  clientes: Cliente[] = [];
  resultados: Cliente[] = [];
  busqueda: string = '';
  buscando: boolean = false;
  clienteSeleccionado: Cliente | null = null;
  historialTickets: ServicioTicket[] = [];

  ngOnInit() {
    this.cargarClientes();
  }

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

  buscar() {
    this.buscando = true;
    const q = this.busqueda.trim().toLowerCase();
    if (!q) {
      this.resultados = this.clientes;
    } else {
      this.resultados = this.clientes.filter(c =>
        (c.nombres?.toLowerCase().includes(q)) ||
        (c.nombre_razon_social?.toLowerCase().includes(q)) ||
        (c.documento?.toLowerCase().includes(q))
      );
    }
    this.buscando = false;
  }

  seleccionarCliente(cliente: Cliente) {
    this.clienteSeleccionado = cliente;
    this.cargarHistorial(cliente);
  }

  cargarHistorial(cliente: Cliente) {
    this.ticketsService.getTickets().pipe(timeout(15000)).subscribe({
      next: (res) => {
        const nombre = (cliente.nombres + ' ' + (cliente.apellidos || '')).trim().toLowerCase();
        const razon = (cliente.nombre_razon_social || '').toLowerCase();
        this.historialTickets = res.filter(t =>
          t.cliente_nombre?.toLowerCase().includes(nombre) ||
          (razon && t.cliente_nombre?.toLowerCase().includes(razon))
        );
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.historialTickets = [];
        this.cdr.detectChanges();
      }
    });
  }

  nombreCliente(cliente: Cliente): string {
    if (!cliente) return '--';
    if (cliente.nombre_razon_social && cliente.nombre_razon_social.trim()) {
      return cliente.nombre_razon_social.trim();
    }
    const partes = [cliente.nombres, cliente.apellidos].filter(p => p && p !== 'null' && p.trim());
    if (partes.length > 0) return partes.join(' ');
    return cliente.email || '--';
  }

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

  getBadgeEstado(estado: string): string {
    switch (estado) {
      case 'Finalizado': return 'badge-success';
      case 'Pendiente': return 'badge-warning';
      case 'Asignado': return 'badge-primary';
      case 'En Sitio': return 'badge-info';
      default: return 'badge-secondary';
    }
  }

  nuevaVisita() {
    this.toast.info('Crea un ticket de servicio desde el módulo de Servicios para registrar una nueva visita.');
  }
}