import { VolverDirective } from '../../../../../shared/directives/volver.directive';
import { SolicitudInactivacionComponent } from '../../../../../shared/components/solicitud-inactivacion/solicitud-inactivacion.component';
import { Component, OnInit, inject, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OperariosTicketsService, ServicioTicket } from '../../../../../services/operarios-tickets.service';
import { ToastService } from '../../../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-gestion-de-operarios',
  standalone: true,
  imports: [CommonModule, FormsModule, SolicitudInactivacionComponent, VolverDirective],
  templateUrl: './gestion-de-operarios.component.html',
  styleUrl: './gestion-de-operarios.component.scss'
})
export class GestionDeOperariosComponent implements OnInit {
  // --- PROPIEDADES DE ENTRADA ---
  @Input() isEmbedded: boolean = false;

  // --- SERVICIOS INYECTADOS ---
  private cdr = inject(ChangeDetectorRef);
  private ticketsService = inject(OperariosTicketsService);
  private toast = inject(ToastService);

  // --- VARIABLES DE ESTADO ---
  tickets: ServicioTicket[] = [];
  cargando = false;
  guardando = false;
  pageSize = 8;
  pageTickets = 1;

  nuevoTicket: ServicioTicket = {
    cliente_nombre: '',
    servicio_requerido: '',
    estado: 'Pendiente'
  };

  // --- GETTERS Y PAGINACION ---
  get paginatedTickets(): ServicioTicket[] {
    const start = (this.pageTickets - 1) * this.pageSize;
    return this.tickets.slice(start, start + this.pageSize);
  }

  get totalPagesTickets(): number {
    return Math.ceil(this.tickets.length / this.pageSize) || 1;
  }

  // Bloque de ciclo de vida OnInit para cargar tickets
  ngOnInit() {
    this.cargarTickets();
  }

  // Bloque para consultar tickets de operarios desde el backend
  cargarTickets() {
    this.cargando = true;
    this.ticketsService.getTickets().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.tickets = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.tickets = [];
        this.toast.error('Error al cargar tickets');
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para validar y registrar un nuevo ticket de servicio
  crearTicket() {
    if (!this.nuevoTicket.cliente_nombre || !this.nuevoTicket.servicio_requerido) {
      return this.toast.warning('Cliente y Servicio son obligatorios');
    }

    this.guardando = true;
    this.ticketsService.crearTicket(this.nuevoTicket).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Ticket creado con éxito');
        this.nuevoTicket = { cliente_nombre: '', servicio_requerido: '', estado: 'Pendiente' };
        this.cargarTickets();
        this.guardando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.toast.error('Error al crear ticket');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para mapear el estado del ticket a una clase visual de badge
  getBadgeEstado(estado: string): string {
    switch (estado) {
      case 'Completado': return 'badge-success';
      case 'Pendiente': return 'badge-warning';
      case 'Asignado': return 'badge-primary';
      case 'En Sitio': return 'badge-info';
      default: return 'badge-secondary';
    }
  }
}
