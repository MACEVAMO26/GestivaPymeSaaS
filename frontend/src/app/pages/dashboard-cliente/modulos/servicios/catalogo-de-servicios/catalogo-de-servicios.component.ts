import { Component, OnInit, inject , ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogoServiciosService, Servicio } from '../../../../../services/catalogo-servicios.service';
import { OperariosTicketsService, ServicioTicket, ServicioMaterial } from '../../../../../services/operarios-tickets.service';
import { InventarioService, Inventario } from '../../../../../services/inventario.service';
import { EmpleadoService } from '../../../../../services/empleado.service';
import { ToastService } from '../../../../../services/toast.service';
import { AuthService } from '../../../../../services/auth.service';
import { GestionDeOperariosComponent } from '../gestion-de-operarios/gestion-de-operarios.component';
import { ReportesDeServiciosComponent } from '../reportes-de-servicios/reportes-de-servicios.component';
import { SolicitudInactivacionComponent } from '../../../../../shared/components/solicitud-inactivacion/solicitud-inactivacion.component';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-catalogo-de-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, SolicitudInactivacionComponent, GestionDeOperariosComponent, ReportesDeServiciosComponent],
  templateUrl: './catalogo-de-servicios.component.html',
  styleUrl: './catalogo-de-servicios.component.scss'
})
export class CatalogoDeServiciosComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private catalogoService = inject(CatalogoServiciosService);
  private ticketsService = inject(OperariosTicketsService);
  private inventarioService = inject(InventarioService);
  private empleadoService = inject(EmpleadoService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);

  activeTab: string = 'recepcion';
  guardando: boolean = false;
  cargando: boolean = false;

  // Recepción
  formTicket: any = { cliente: '', servicio: '', fecha: '', hora: '', direccion: '' };

  catalogo: Servicio[] = [];
  tickets: ServicioTicket[] = [];
  ticketsPendientes: ServicioTicket[] = [];

  // Rendimiento Técnico
  tecnicos: any[] = [];
  tecnicoDashboard: any = null;

  // Asignación
  modalAsignacion: boolean = false;
  ticketSeleccionado: any = null;
  tecnicoSeleccionado: string = '';

  // Ejecución / Materiales
  modalEjecucion: boolean = false;
  inventario: Inventario[] = [];
  materialSeleccionado: string = '';
  cantidadMaterial: number = 1;
  materialesUsados: any[] = [];
  notasEjecucion: string = '';

  ngOnInit() {
    this.cargarCatalogo();
    this.cargarTickets();
    this.cargarInventario();
    this.cargarTecnicos();
  }

  cargarCatalogo() {
    this.catalogoService.getServicios().pipe(timeout(15000)).subscribe({
      next: (res) => { this.catalogo = res;
        this.cdr.detectChanges(); },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } this.catalogo = [];
        this.cdr.detectChanges(); }
    });
  }

  cargarTickets() {
    this.cargando = true;
    this.ticketsService.getTickets().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.tickets = res;
        this.filtrarTicketsPendientes();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.tickets = [];
        this.ticketsPendientes = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarInventario() {
    this.inventarioService.getInventario().pipe(timeout(15000)).subscribe({
      next: (res) => { this.inventario = res;
        this.cdr.detectChanges(); },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } this.inventario = [];
        this.cdr.detectChanges(); }
    });
  }

  cargarTecnicos() {
    this.empleadoService.getEmpleados().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.tecnicos = res.filter((e: any) => {
          const rol = (e.usuario?.rol?.nombre || '').toLowerCase();
          const cargo = (e.cargo?.nombre || e.puesto || '').toLowerCase();
          const area = (e.area?.nombre || e.cargo?.area?.nombre || e.usuario?.area?.nombre || '').toLowerCase();

          // Excluir explícitamente a Gerencia, Jefes (Jefe de Área, Jefe RRHH, etc.), Coordinadores y Recursos Humanos
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

          // Operativos exclusivamente del área de Servicios (o cargo operativo de campo/servicio)
          const esAreaServicios = area === '' || area.includes('servicio') || area.includes('técnic') || area.includes('tecnic') || area.includes('campo');
          const esCargoOperativoTecnico = cargo.includes('tecnic') || cargo.includes('operar') || cargo.includes('operativ') || cargo.includes('campo') || cargo.includes('manten') || cargo.includes('servicio');
          const esRolOperativo = rol === 'operativo' || rol.includes('operativo');

          return (esRolOperativo || esCargoOperativoTecnico) && esAreaServicios;
        }).map((e: any) => ({
          id: e.id,
          nombre: `${e.usuario?.primer_nombre || e.usuario?.nombres || ''} ${e.usuario?.primer_apellido || e.usuario?.apellidos || ''}`.trim(),
          cargo: e.cargo?.nombre || 'Técnico',
          estado: e.estado
        })).filter((t: any) => t.nombre);

        if (this.tecnicos.length > 0) {
          this.seleccionarTecnicoRender(this.tecnicos[0]);
        } else {
          this.tecnicoDashboard = null;
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.tecnicos = [];
        this.tecnicoDashboard = null;
        this.cdr.detectChanges();
      }
    });
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'recepcion' || tab === 'agenda' || tab === 'ejecucion') this.cargarTickets();
    if (tab === 'catalogo') this.cargarCatalogo();
  }

  nombreTecnico(id?: number): string {
    const tec = this.tecnicos.find(t => t.id === id);
    return tec?.nombre || 'Sin Asignar';
  }

  codigoServicio(id?: number): string {
    return `SERV-${String(id).padStart(3, '0')}`;
  }

  crearTicket() {
    if (!this.formTicket.cliente || !this.formTicket.servicio) {
      this.toast.warning('Complete cliente y servicio');
      return;
    }
    this.guardando = true;
    const ticket: ServicioTicket = {
      cliente_nombre: this.formTicket.cliente,
      servicio_requerido: this.formTicket.servicio,
      fecha_solicitada: this.formTicket.fecha || undefined,
      hora_sugerida: this.formTicket.hora || undefined,
      direccion: this.formTicket.direccion || undefined,
      estado: 'Pendiente'
    };
    this.ticketsService.crearTicket(ticket).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Ticket creado exitosamente');
        this.formTicket = { cliente: '', servicio: '', fecha: '', hora: '', direccion: '' };
        this.guardando = false;
        this.cargarTickets();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.toast.error('Error al crear el ticket');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  filtrarTicketsPendientes() {
    this.ticketsPendientes = this.tickets.filter(t => t.estado === 'Pendiente');
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

  puedeAsignarOperarios(): boolean {
    const user = this.authService.getUser();
    if (!user) return false;

    const rol = (user.rol?.nombre || '').toLowerCase();
    const cargo = (user.cargo?.nombre || user.puesto || '').toLowerCase();

    // El único que puede asignar y mover un operario es el Jefe de Servicios, Coordinador de Operativos o Gerente
    return (
      rol.includes('gerente') ||
      cargo.includes('gerente') ||
      cargo.includes('jefe de servicio') ||
      cargo.includes('jefe de servicios') ||
      cargo.includes('coordinador de operativo') ||
      cargo.includes('coordinador de operario') ||
      cargo.includes('coordinador de servicio')
    );
  }

  // --- ASIGNACION ---
  abrirAsignacion(tk: any) {
    if (!this.puedeAsignarOperarios()) {
      this.toast.warning('Solo el Jefe de Servicios y el Coordinador de Operativos pueden asignar o mover operarios.');
      return;
    }
    this.ticketSeleccionado = tk;
    this.tecnicoSeleccionado = tk.tecnico_id ? String(tk.tecnico_id) : '';
    this.modalAsignacion = true;
  }

  cerrarAsignacion() {
    this.modalAsignacion = false;
    this.ticketSeleccionado = null;
  }

  guardarAsignacion() {
    if (!this.puedeAsignarOperarios()) {
      this.toast.warning('Solo el Jefe de Servicios y el Coordinador de Operativos pueden asignar o mover operarios.');
      return;
    }
    if (!this.ticketSeleccionado?.id || !this.tecnicoSeleccionado) {
      this.toast.warning('Seleccione un técnico');
      return;
    }
    this.guardando = true;
    this.ticketsService.actualizarEstado(this.ticketSeleccionado.id, 'Asignado', Number(this.tecnicoSeleccionado)).pipe(timeout(15000)).subscribe({
      next: () => {
        this.toast.success('Técnico despachado exitosamente');
        this.cerrarAsignacion();
        this.guardando = false;
        this.cargarTickets();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.toast.error('Error al asignar técnico');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- EJECUCION ---
  abrirEjecucion(tk: any) {
    this.ticketSeleccionado = tk;
    this.materialSeleccionado = '';
    this.cantidadMaterial = 1;
    this.materialesUsados = [];
    this.notasEjecucion = '';
    this.modalEjecucion = true;
  }

  cerrarEjecucion() {
    this.modalEjecucion = false;
    this.ticketSeleccionado = null;
  }

  nombreProducto(id: number): string {
    const inv = this.inventario.find(i => i.producto_id === id);
    return inv?.producto?.nombre || `Producto #${id}`;
  }

  stockProducto(id: number): number {
    const inv = this.inventario.find(i => i.producto_id === id);
    return inv?.stock_actual || 0;
  }

  agregarMaterial() {
    if (this.materialSeleccionado && this.cantidadMaterial > 0) {
      const productoId = Number(this.materialSeleccionado);
      this.materialesUsados.push({
        producto_id: productoId,
        cantidad: this.cantidadMaterial
      });
      this.materialSeleccionado = '';
      this.cantidadMaterial = 1;
    }
  }

  finalizarServicio() {
    if (!this.ticketSeleccionado?.id) return;
    this.guardando = true;

    const ticketId = this.ticketSeleccionado.id;
    let acciones = Promise.resolve();

    for (const mat of this.materialesUsados) {
      const material: ServicioMaterial = {
        producto_id: mat.producto_id,
        cantidad: mat.cantidad
      };
      acciones = acciones.then(() =>
        new Promise<void>((resolve, reject) => {
          this.ticketsService.agregarMaterial(ticketId, material).pipe(timeout(10000)).subscribe({
            next: () => resolve(),
            error: () => reject()
          });
        })
      );
    }

    acciones
      .then(() => {
        const tecnicoId = this.ticketSeleccionado?.tecnico_id;
        return this.ticketsService.actualizarEstado(ticketId, 'Finalizado', tecnicoId, this.notasEjecucion).pipe(timeout(10000)).toPromise();
      })
      .then(() => {
        this.toast.success('Servicio cerrado. Materiales descontados.');
        this.cerrarEjecucion();
        this.guardando = false;
        this.cargarTickets();
      })
      .catch(() => {
        this.toast.error('Error al finalizar el servicio');
        this.guardando = false;
      });
  }

  // --- RENDIMIENTO ---
  seleccionarTecnicoRender(tec: any) {
    const ticketsTec = this.tickets.filter(t => t.tecnico_id === tec.id);
    const finalizados = ticketsTec.filter(t => t.estado === 'Finalizado').length;
    this.tecnicoDashboard = {
      ...tec,
      rendimiento: {
        cumplidas: finalizados,
        total: ticketsTec.length,
        satisfactorias: finalizados,
        quejas: 0
      }
    };
  }

  getPorcentaje(valor: number, total: number = 100): number {
    if (total <= 0) return 0;
    return Math.min(Math.round((valor / total) * 100), 100);
  }
}
