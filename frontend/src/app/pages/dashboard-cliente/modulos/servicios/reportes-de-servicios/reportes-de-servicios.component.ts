import { Component, OnInit, inject, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OperariosTicketsService, ServicioTicket } from '../../../../../services/operarios-tickets.service';
import { EmpleadoService } from '../../../../../services/empleado.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-reportes-de-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes-de-servicios.component.html',
  styleUrl: './reportes-de-servicios.component.scss'
})
export class ReportesDeServiciosComponent implements OnInit {
  @Input() isEmbedded: boolean = false;
  private cdr = inject(ChangeDetectorRef);
  private ticketsService = inject(OperariosTicketsService);
  private empleadoService = inject(EmpleadoService);

  desde: string = '';
  hasta: string = '';
  cargando: boolean = false;
  todosTickets: ServicioTicket[] = [];
  tecnicos: any[] = [];

  totalAtendidos: number = 0;
  tecnicoTop: string = 'N/A';
  servicioTop: string = 'N/A';
  tasaFinalizacion: number = 0;

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.ticketsService.getTickets().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.todosTickets = res;
        this.empleadoService.getEmpleados().pipe(timeout(15000)).subscribe({
          next: (emp) => {
            this.tecnicos = emp.filter((e: any) => {
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
            }).map((e: any) => ({
              id: e.id,
              nombre: `${e.usuario?.primer_nombre || e.usuario?.nombres || ''} ${e.usuario?.primer_apellido || e.usuario?.apellidos || ''}`.trim()
            })).filter((t: any) => t.nombre);
            this.calcular();
            this.cargando = false;
        this.cdr.detectChanges();
          },
          error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          console.error('Tiempo de espera agotado');
        }
            this.tecnicos = [];
            this.calcular();
            this.cargando = false;
        this.cdr.detectChanges();
          }
        });
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          console.error('Tiempo de espera agotado');
        }
        this.todosTickets = [];
        this.tecnicos = [];
        this.calcular();
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  getTicketsFiltrados(): ServicioTicket[] {
    if (!this.desde && !this.hasta) return this.todosTickets;
    return this.todosTickets.filter(t => {
      if (!t.fecha_solicitada) return true;
      if (this.desde && t.fecha_solicitada < this.desde) return false;
      if (this.hasta && t.fecha_solicitada > this.hasta) return false;
      return true;
    });
  }

  calcular() {
    const tickets = this.getTicketsFiltrados();
    this.totalAtendidos = tickets.filter(t => t.estado === 'Finalizado').length;

    // Técnico con más servicios
    const porTecnico = new Map<number, number>();
    for (const t of tickets) {
      if (t.tecnico_id) {
        porTecnico.set(t.tecnico_id, (porTecnico.get(t.tecnico_id) || 0) + 1);
      }
    }
    let max = 0;
    let maxId: number | null = null;
    porTecnico.forEach((v, k) => {
      if (v > max) { max = v; maxId = k; }
    });
    const topTec = this.tecnicos.find(t => t.id === maxId);
    this.tecnicoTop = topTec?.nombre || 'N/A';

    // Servicio más demandado
    const porServicio = new Map<string, number>();
    for (const t of tickets) {
      const key = t.servicio_requerido || 'Sin servicio';
      porServicio.set(key, (porServicio.get(key) || 0) + 1);
    }
    let maxS = 0;
    let topServicio = 'N/A';
    porServicio.forEach((v, k) => {
      if (v > maxS) { maxS = v; topServicio = k; }
    });
    this.servicioTop = topServicio;

    // Tasa de finalización
    const noCancelados = tickets.filter(t => t.estado !== 'Cancelado');
    this.tasaFinalizacion = noCancelados.length > 0
      ? Math.round((tickets.filter(t => t.estado === 'Finalizado').length / noCancelados.length) * 100)
      : 0;
  }

  generarReporte() {
    this.calcular();
  }
}
