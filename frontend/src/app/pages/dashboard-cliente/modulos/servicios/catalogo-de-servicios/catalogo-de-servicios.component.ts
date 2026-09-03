import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
  filtroEstado: string = 'TODOS';

  // Recepción
  tipoServicio: 'DOMICILIO' | 'TALLER' = 'DOMICILIO';
  formTicket: any = { 
    cliente: '', 
    servicio: '', 
    fecha: '', 
    hora: '', 
    direccion: '',
    equipo: '',
    serie: '',
    accesorios: '',
    falla: '',
    costo: 0
  };

  catalogo: Servicio[] = [];
  tickets: ServicioTicket[] = [];
  ticketsPendientes: ServicioTicket[] = [];

  // Rendimiento Técnico
  tecnicos: any[] = [];
  tecnicoDashboard: any = null;

  // Asignación / Despacho
  modalAsignacion: boolean = false;
  ticketSeleccionado: ServicioTicket | null = null;
  tecnicoSeleccionado: string = '';

  // Ejecución / Mini-Inventario
  modalEjecucion: boolean = false;
  inventario: Inventario[] = [];
  materialSeleccionado: string = '';
  cantidadMaterial: number = 1;
  materialesUsados: any[] = [];
  notasEjecucion: string = '';
  tiempoEjecucion: number = 60;
  costoManoObra: number = 0;

  // Calificación del Servicio
  modalCalificacion: boolean = false;
  ticketParaCalificar: ServicioTicket | null = null;
  calificacionTecnico: number = 5;
  feedbackTecnico: string = '';
  calificacionCliente: number = 5;
  feedbackCliente: string = '';

  ngOnInit() {
    this.cargarCatalogo();
    this.cargarTickets();
    this.cargarInventario();
    this.cargarTecnicos();
  }

  cargarCatalogo() {
    this.catalogoService.getServicios().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.catalogo = res;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.catalogo = [];
        this.cdr.detectChanges();
      }
    });
  }

  cargarTickets() {
    this.cargando = true;
    this.ticketsService.getTickets().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.tickets = res;
        this.filtrarTicketsPendientes();
        if (this.tecnicos.length > 0 && this.tecnicoDashboard) {
          const tec = this.tecnicos.find(t => t.id === this.tecnicoDashboard.id);
          if (tec) this.seleccionarTecnicoRender(tec);
        }
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
      next: (res) => {
        this.inventario = res;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.inventario = [];
        this.cdr.detectChanges();
      }
    });
  }

  cargarTecnicos() {
    this.empleadoService.getEmpleados().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.tecnicos = res.filter((e: any) => {
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
          nombre: `${e.usuario?.primer_nombre || e.usuario?.nombres || ''} ${e.usuario?.primer_apellido || e.usuario?.apellidos || ''}`.trim(),
          cargo: e.cargo?.nombre || 'Técnico Operativo',
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
    if (tab === 'recepcion' || tab === 'agenda' || tab === 'ejecucion' || tab === 'rendimiento') {
      this.cargarTickets();
    }
    if (tab === 'catalogo') this.cargarCatalogo();
  }

  nombreTecnico(id?: number): string {
    const tec = this.tecnicos.find(t => t.id === id);
    return tec?.nombre || 'Sin Asignar';
  }

  codigoServicio(id?: number): string {
    return `SERV-${String(id).padStart(3, '0')}`;
  }

  onServicioSeleccionado() {
    const s = this.catalogo.find(c => c.nombre === this.formTicket.servicio);
    if (s && s.tarifa) {
      this.formTicket.costo = s.tarifa;
    }
  }

  crearTicket() {
    if (!this.formTicket.cliente || !this.formTicket.servicio) {
      this.toast.warning('Complete cliente y servicio');
      return;
    }
    this.guardando = true;

    const estadoInicial = this.tipoServicio === 'TALLER' ? 'Recibido' : 'Pendiente';

    const ticket: ServicioTicket = {
      cliente_nombre: this.formTicket.cliente,
      servicio_requerido: this.formTicket.servicio,
      fecha_solicitada: this.formTicket.fecha || new Date().toISOString().split('T')[0],
      hora_sugerida: this.formTicket.hora || '09:00',
      direccion: this.tipoServicio === 'TALLER' ? 'Sede Central - Taller / Laboratorio' : (this.formTicket.direccion || 'A convenir con cliente'),
      estado: estadoInicial,
      equipo_recibido: this.tipoServicio === 'TALLER' ? this.formTicket.equipo : undefined,
      serie_equipo: this.tipoServicio === 'TALLER' ? this.formTicket.serie : undefined,
      accesorios_recibidos: this.tipoServicio === 'TALLER' ? this.formTicket.accesorios : undefined,
      falla_reportada: this.tipoServicio === 'TALLER' ? this.formTicket.falla : undefined,
      costo_total: this.formTicket.costo || 0
    };

    this.ticketsService.crearTicket(ticket).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success(`Ticket registrado exitosamente en estado "${estadoInicial}"`);
        this.formTicket = { cliente: '', servicio: '', fecha: '', hora: '', direccion: '', equipo: '', serie: '', accesorios: '', falla: '', costo: 0 };
        this.guardando = false;
        this.cargarTickets();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } else {
          this.toast.error('Error al crear el ticket');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  filtrarTicketsPendientes() {
    this.ticketsPendientes = this.tickets.filter(t => t.estado === 'Pendiente' || t.estado === 'Recibido');
  }

  getTicketsFiltrados(): ServicioTicket[] {
    if (this.filtroEstado === 'TODOS') return this.tickets;
    return this.tickets.filter(t => t.estado === this.filtroEstado);
  }

  getBadgeEstado(estado: string): string {
    switch (estado) {
      case 'Finalizado': return 'badge-success';
      case 'Pendiente': return 'badge-warning';
      case 'Recibido': return 'badge-info';
      case 'Asignado': return 'badge-primary';
      case 'En Camino': return 'badge-warning';
      case 'En Sitio': return 'badge-info';
      case 'Cancelado': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  }

  getIconoEstado(estado: string): string {
    switch (estado) {
      case 'Finalizado': return 'fas fa-check-circle';
      case 'Pendiente': return 'fas fa-clock';
      case 'Recibido': return 'fas fa-inbox';
      case 'Asignado': return 'fas fa-user-check';
      case 'En Camino': return 'fas fa-truck';
      case 'En Sitio': return 'fas fa-map-marker-alt';
      case 'Cancelado': return 'fas fa-ban';
      default: return 'fas fa-info-circle';
    }
  }

  puedeAsignarOperarios(): boolean {
    const user = this.authService.getUser();
    if (!user) return false;

    const rol = (user.rol?.nombre || '').toLowerCase();
    const cargo = (user.cargo?.nombre || user.puesto || '').toLowerCase();

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

  // --- ASIGNACION & DESPACHO ---
  abrirAsignacion(tk: ServicioTicket) {
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

  guardarAsignacion(nuevoEstado: string = 'Asignado') {
    if (!this.puedeAsignarOperarios()) {
      this.toast.warning('Solo el Jefe de Servicios y el Coordinador de Operativos pueden asignar o mover operarios.');
      return;
    }
    if (!this.ticketSeleccionado?.id || !this.tecnicoSeleccionado) {
      this.toast.warning('Seleccione un técnico');
      return;
    }
    this.guardando = true;
    this.ticketsService.actualizarEstado(this.ticketSeleccionado.id, nuevoEstado, Number(this.tecnicoSeleccionado)).pipe(timeout(15000)).subscribe({
      next: () => {
        this.toast.success(`Servicio actualizado a "${nuevoEstado}" con técnico asignado.`);
        this.cerrarAsignacion();
        this.guardando = false;
        this.cargarTickets();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } else {
          this.toast.error('Error al asignar técnico');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cambiarEstadoDirecto(tk: ServicioTicket, nuevoEstado: string) {
    if (!tk.id) return;
    this.guardando = true;
    this.ticketsService.actualizarEstado(tk.id, nuevoEstado, tk.tecnico_id).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success(`Servicio actualizado a "${nuevoEstado}".`);
        this.guardando = false;
        this.cargarTickets();
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Error al actualizar estado del servicio.');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- EJECUCIÓN & MINI-INVENTARIO ---
  abrirEjecucion(tk: ServicioTicket) {
    this.ticketSeleccionado = tk;
    this.materialSeleccionado = '';
    this.cantidadMaterial = 1;
    this.materialesUsados = tk.materiales ? [...tk.materiales] : [];
    this.notasEjecucion = tk.notas_ejecucion || '';
    this.tiempoEjecucion = tk.tiempo_minutos || 60;
    this.costoManoObra = tk.costo_total || 0;
    this.calificacionTecnico = tk.calificacion_tecnico || 5;
    this.feedbackTecnico = tk.feedback_tecnico || '';
    this.calificacionCliente = tk.calificacion_cliente || 5;
    this.feedbackCliente = tk.feedback_cliente || '';
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

  precioProducto(id: number): number {
    const inv = this.inventario.find(i => i.producto_id === id);
    return Number(inv?.producto?.precio || 0);
  }

  agregarMaterial() {
    if (!this.ticketSeleccionado?.id) return;
    if (!this.materialSeleccionado || this.cantidadMaterial <= 0) {
      this.toast.warning('Seleccione un repuesto/material y cantidad válida.');
      return;
    }

    const productoId = Number(this.materialSeleccionado);
    const stock = this.stockProducto(productoId);
    if (this.cantidadMaterial > stock) {
      this.toast.warning(`Stock insuficiente. Disponible: ${stock}`);
      return;
    }

    const nuevoMaterial: ServicioMaterial = {
      producto_id: productoId,
      cantidad: this.cantidadMaterial,
      precio_unitario: this.precioProducto(productoId),
      subtotal: this.precioProducto(productoId) * this.cantidadMaterial,
      estado_material: 'Utilizado'
    };

    this.ticketsService.agregarMaterial(this.ticketSeleccionado.id, nuevoMaterial).pipe(timeout(10000)).subscribe({
      next: (res) => {
        this.toast.success('Material agregado al servicio.');
        this.materialesUsados.push(res);
        this.materialSeleccionado = '';
        this.cantidadMaterial = 1;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Error al agregar material al servicio.');
      }
    });
  }

  eliminarMaterial(mat: ServicioMaterial, index: number) {
    if (!this.ticketSeleccionado?.id || !mat.id) {
      this.materialesUsados.splice(index, 1);
      return;
    }

    this.ticketsService.eliminarMaterial(this.ticketSeleccionado.id, mat.id).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Material removido del servicio.');
        this.materialesUsados.splice(index, 1);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Error al remover material.');
      }
    });
  }

  getTotalMateriales(): number {
    return this.materialesUsados.reduce((acc, m) => acc + (m.subtotal || (m.cantidad * (m.precio_unitario || 0))), 0);
  }

  getCostoTotalCalculado(): number {
    return (Number(this.costoManoObra) || 0) + this.getTotalMateriales();
  }

  finalizarServicio() {
    if (!this.ticketSeleccionado?.id) return;
    this.guardando = true;

    const extraData = {
      tiempo_minutos: this.tiempoEjecucion,
      costo_total: this.getCostoTotalCalculado(),
      calificacion_tecnico: this.calificacionTecnico,
      feedback_tecnico: this.feedbackTecnico,
      calificacion_cliente: this.calificacionCliente,
      feedback_cliente: this.feedbackCliente
    };

    const tecnicoId = this.ticketSeleccionado.tecnico_id;

    this.ticketsService.actualizarEstado(this.ticketSeleccionado.id, 'Finalizado', tecnicoId, this.notasEjecucion, extraData)
      .pipe(timeout(15000))
      .subscribe({
        next: () => {
          this.toast.success('¡Servicio finalizado con éxito! Materiales descontados de inventario y calificaciones registradas.');
          this.cerrarEjecucion();
          this.guardando = false;
          this.cargarTickets();
          this.cargarInventario();
          this.cdr.detectChanges();
        },
        error: () => {
          this.toast.error('Error al finalizar el servicio.');
          this.guardando = false;
          this.cdr.detectChanges();
        }
      });
  }

  // --- CALIFICACIÓN MUTUA (MODAL INDEPENDIENTE) ---
  abrirModalCalificacion(tk: ServicioTicket) {
    this.ticketParaCalificar = tk;
    this.calificacionTecnico = tk.calificacion_tecnico || 5;
    this.feedbackTecnico = tk.feedback_tecnico || '';
    this.calificacionCliente = tk.calificacion_cliente || 5;
    this.feedbackCliente = tk.feedback_cliente || '';
    this.modalCalificacion = true;
  }

  cerrarModalCalificacion() {
    this.modalCalificacion = false;
    this.ticketParaCalificar = null;
  }

  setStarsTecnico(n: number) {
    this.calificacionTecnico = n;
  }

  setStarsCliente(n: number) {
    this.calificacionCliente = n;
  }

  guardarCalificacion() {
    if (!this.ticketParaCalificar?.id) return;
    this.guardando = true;

    this.ticketsService.calificarTicket(this.ticketParaCalificar.id, {
      calificacion_tecnico: this.calificacionTecnico,
      feedback_tecnico: this.feedbackTecnico,
      calificacion_cliente: this.calificacionCliente,
      feedback_cliente: this.feedbackCliente
    }).pipe(timeout(10000)).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Calificación guardada exitosamente.');
        this.cerrarModalCalificacion();
        this.guardando = false;
        this.cargarTickets();
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Error al guardar la calificación.');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- RENDIMIENTO TÉCNICO ---
  seleccionarTecnicoRender(tec: any) {
    const ticketsTec = this.tickets.filter(t => t.tecnico_id === tec.id);
    const finalizados = ticketsTec.filter(t => t.estado === 'Finalizado');
    const enCamino = ticketsTec.filter(t => t.estado === 'En Camino').length;
    const enSitio = ticketsTec.filter(t => t.estado === 'En Sitio').length;
    const asignados = ticketsTec.filter(t => t.estado === 'Asignado').length;

    // Calcular promedio de calificación del técnico
    const conCalificacion = finalizados.filter(t => t.calificacion_tecnico && t.calificacion_tecnico > 0);
    const sumaCalif = conCalificacion.reduce((acc, t) => acc + (t.calificacion_tecnico || 0), 0);
    const promedioEstrellas = conCalificacion.length > 0 ? (sumaCalif / conCalificacion.length) : 5.0;

    const satisfaccionSLA = finalizados.filter(t => (t.calificacion_tecnico || 5) >= 4).length;
    const quejas = finalizados.filter(t => (t.calificacion_tecnico || 5) <= 2).length;

    this.tecnicoDashboard = {
      ...tec,
      promedioEstrellas: Number(promedioEstrellas.toFixed(1)),
      rendimiento: {
        cumplidas: finalizados.length,
        total: ticketsTec.length,
        enCamino,
        enSitio,
        asignados,
        satisfactorias: satisfaccionSLA,
        quejas: quejas
      },
      feedbacks: finalizados.filter(t => t.feedback_tecnico).map(t => ({
        cliente: t.cliente_nombre,
        estrellas: t.calificacion_tecnico,
        comentario: t.feedback_tecnico,
        fecha: t.fecha_solicitada,
        servicio: t.servicio_requerido
      })),
      feedbacksAClientes: finalizados.filter(t => t.feedback_cliente).map(t => ({
        cliente: t.cliente_nombre,
        estrellas: t.calificacion_cliente,
        comentario: t.feedback_cliente,
        fecha: t.fecha_solicitada
      }))
    };
  }

  getPorcentaje(valor: number, total: number = 100): number {
    if (total <= 0) return 0;
    return Math.min(Math.round((valor / total) * 100), 100);
  }

  getStarArray(n: number = 5): number[] {
    return Array.from({ length: Math.round(n) }, (_, i) => i + 1);
  }
}
