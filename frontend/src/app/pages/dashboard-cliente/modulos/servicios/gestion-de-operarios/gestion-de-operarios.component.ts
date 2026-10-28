import { VolverDirective } from '../../../../../shared/directives/volver.directive';
import { SolicitudInactivacionComponent } from '../../../../../shared/components/solicitud-inactivacion/solicitud-inactivacion.component';
import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OperariosTicketsService, ServicioTicket } from '../../../../../services/operarios-tickets.service';
import { EmpleadoService } from '../../../../../services/empleado.service';
import { ToastService } from '../../../../../services/toast.service';
import { timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  private destroyRef = inject(DestroyRef);
  private ticketsService = inject(OperariosTicketsService);
  private empleadoService = inject(EmpleadoService);
  private toast = inject(ToastService);

  // --- VARIABLES DE ESTADO ---
  tickets: ServicioTicket[] = [];
  tecnicos: any[] = [];
  searchTermOperarios: string = '';
  cargando = false;
  guardando = false;
  pageSize = 8;
  pageTickets = 1;

  nuevoTicket: ServicioTicket = {
    cliente_nombre: '',
    servicio_requerido: '',
    estado: 'Pendiente',
    tecnico_id: undefined
  };

  // --- GETTERS Y FILTRADO ---
  get ticketsFiltrados(): ServicioTicket[] {
    if (!this.searchTermOperarios.trim()) return this.tickets;
    const term = this.searchTermOperarios.trim().toLowerCase();
    return this.tickets.filter(t => {
      const c = (t.consecutivo || '').toLowerCase();
      const cli = (t.cliente_nombre || '').toLowerCase();
      const s = (t.servicio_requerido || '').toLowerCase();
      const tec = this.nombreTecnico(t.tecnico_id).toLowerCase();
      const est = (t.estado || '').toLowerCase();
      const dir = (t.direccion || '').toLowerCase();
      return c.includes(term) || cli.includes(term) || s.includes(term) || tec.includes(term) || est.includes(term) || dir.includes(term);
    });
  }

  get paginatedTickets(): ServicioTicket[] {
    const start = (this.pageTickets - 1) * this.pageSize;
    return this.ticketsFiltrados.slice(start, start + this.pageSize);
  }

  get totalPagesTickets(): number {
    return Math.ceil(this.ticketsFiltrados.length / this.pageSize) || 1;
  }

  // Bloque de ciclo de vida OnInit para cargar tickets y técnicos
  ngOnInit() {
    this.cargarTickets();
    this.cargarTecnicos();
  }

  // Bloque para consultar técnicos disponibles desde EmpleadoService
  cargarTecnicos() {
    if (this.tecnicos.length > 0) return;
    this.empleadoService.getEmpleados().pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
      next: (res) => {
        let filtered = res.filter((e: any) => {
          const rol = (e.usuario?.rol?.nombre || '').toLowerCase();
          const cargo = (e.cargo?.nombre || e.puesto || '').toLowerCase();
          const area = (e.area?.nombre || e.cargo?.area?.nombre || e.usuario?.area?.nombre || '').toLowerCase();

          if (
            rol.includes('gerente') ||
            rol.includes('jefe') ||
            rol.includes('recursos humanos') ||
            rol.includes('rrhh') ||
            cargo.includes('gerente') ||
            cargo.includes('jefe') ||
            cargo.includes('recursos humanos') ||
            cargo.includes('rrhh') ||
            cargo.includes('director') ||
            cargo.includes('coordinador')
          ) {
            return false;
          }

          const esAreaServicios = area === '' || area.includes('servicio') || area.includes('técnic') || area.includes('tecnic') || area.includes('campo');
          const esCargoOperativoTecnico = cargo.includes('tecnic') || cargo.includes('operar') || cargo.includes('operativ') || cargo.includes('campo') || cargo.includes('manten') || cargo.includes('servicio');
          const esRolOperativo = rol === 'operativo' || rol.includes('operativo');

          return (esRolOperativo || esCargoOperativoTecnico) && esAreaServicios;
        });

        if (filtered.length === 0 && res.length > 0) {
          filtered = res;
        }

        this.tecnicos = filtered.map((e: any) => ({
          id: e.id,
          nombre: `${e.usuario?.primer_nombre || e.usuario?.nombres || ''} ${e.usuario?.primer_apellido || e.usuario?.apellidos || ''}`.trim() || e.nombre || `Empleado #${e.id}`,
          cargo: e.cargo?.nombre || e.puesto || 'Técnico Operativo',
          estado: e.estado
        })).filter((t: any) => t.nombre);

        this.cdr.detectChanges();
      },
      error: () => {
        this.tecnicos = [];
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para obtener el nombre legible del técnico
  nombreTecnico(id?: number): string {
    if (!id) return 'Sin Asignar';
    const tec = this.tecnicos.find(t => t.id === Number(id));
    return tec?.nombre || `Técnico #${id}`;
  }

  // Bloque para consultar tickets de operarios desde el backend
  cargarTickets(forzar = false) {
    if (this.cargando) return;
    if (!forzar && this.tickets.length > 0) return;
    this.cargando = true;
    this.ticketsService.getTickets().pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
      next: (res) => {
        this.tickets = Array.isArray(res) ? res : ((res as any)?.data || []);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.tickets = [];
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
    if (this.nuevoTicket.tecnico_id) {
      this.nuevoTicket.estado = 'Asignado';
    }

    this.ticketsService.crearTicket(this.nuevoTicket).pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
      next: () => {
        this.toast.success('Ticket creado con éxito');
        this.nuevoTicket = { cliente_nombre: '', servicio_requerido: '', estado: 'Pendiente', tecnico_id: undefined };
        this.cargarTickets(true);
        this.guardando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado al crear ticket');
        } else {
          this.toast.error('Error al crear ticket');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para mapear el estado del ticket a una clase visual de badge
  getBadgeEstado(estado: string): string {
    switch (estado) {
      case 'Completado':
      case 'Finalizado': return 'badge-success';
      case 'Pendiente': return 'badge-warning';
      case 'Recibido': return 'badge-info';
      case 'Asignado': return 'badge-primary';
      case 'En Camino': return 'badge-warning';
      case 'En Sitio': return 'badge-info';
      default: return 'badge-secondary';
    }
  }
}
