import { VolverDirective } from '../../../../../shared/directives/volver.directive';
import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogoServiciosService, Servicio } from '../../../../../services/catalogo-servicios.service';
import { OperariosTicketsService, ServicioTicket, ServicioMaterial } from '../../../../../services/operarios-tickets.service';
import { InventarioService, Inventario } from '../../../../../services/inventario.service';
import { EmpleadoService } from '../../../../../services/empleado.service';
import { ClienteService } from '../../../../../services/cliente.service';
import { ToastService } from '../../../../../services/toast.service';
import { AuthService } from '../../../../../services/auth.service';
import { GestionDeOperariosComponent } from '../gestion-de-operarios/gestion-de-operarios.component';
import { ReportesDeServiciosComponent } from '../reportes-de-servicios/reportes-de-servicios.component';
import { SolicitudInactivacionComponent } from '../../../../../shared/components/solicitud-inactivacion/solicitud-inactivacion.component';
import { timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-catalogo-de-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, SolicitudInactivacionComponent, GestionDeOperariosComponent, ReportesDeServiciosComponent, VolverDirective],
  templateUrl: './catalogo-de-servicios.component.html',
  styleUrl: './catalogo-de-servicios.component.scss'
})
export class CatalogoDeServiciosComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private catalogoService = inject(CatalogoServiciosService);
  private ticketsService = inject(OperariosTicketsService);
  private inventarioService = inject(InventarioService);
  private empleadoService = inject(EmpleadoService);
  private clienteService = inject(ClienteService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);

  // --- VARIABLES DE ESTADO ---
  activeTab: string = 'recepcion';
  guardando: boolean = false;
  cargando: boolean = false;
  filtroEstado: string = 'TODOS';
  tipoServicio: 'DOMICILIO' | 'TALLER' = 'DOMICILIO';
  formTicket: any = { 
    cliente: '', 
    servicio: '', 
    tecnico_id: null,
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
  clientes: any[] = [];
  tickets: ServicioTicket[] = [];
  ticketsPendientes: ServicioTicket[] = [];
  tecnicos: any[] = [];
  tecnicoDashboard: any = null;
  modalAsignacion: boolean = false;
  ticketSeleccionado: ServicioTicket | null = null;
  tecnicoSeleccionado: string = '';
  modalEjecucion: boolean = false;
  inventario: Inventario[] = [];
  materialSeleccionado: string = '';
  cantidadMaterial: number = 1;
  materialesUsados: any[] = [];
  notasEjecucion: string = '';
  tiempoEjecucion: number = 60;
  costoManoObra: number = 0;
  modalCalificacion: boolean = false;
  ticketParaCalificar: ServicioTicket | null = null;
  calificacionTecnico: number = 5;
  feedbackTecnico: string = '';
  calificacionCliente: number = 5;
  feedbackCliente: string = '';

  // Bloque de inicialización del componente y carga de datos iniciales
  ngOnInit() {
    this.cargarCatalogo();
    this.cargarTickets(true);
    this.cargarTecnicos();
    this.cargarClientes();
  }

  cargarClientes() {
    if (this.clientes.length > 0) return;
    this.clienteService.getClientes().pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
      next: (res) => {
        this.clientes = Array.isArray(res) ? res : ((res as any)?.data || []);
        this.cdr.detectChanges();
      },
      error: () => {
        this.clientes = [];
        this.cdr.detectChanges();
      }
    });
  }

  onClienteSeleccionado() {
    if (!this.formTicket.cliente) return;
    const match = this.clientes.find((c: any) => {
      const nombre = (c.nombre_razon_social || `${c.nombres || ''} ${c.apellidos || ''}`).trim().toLowerCase();
      return nombre === this.formTicket.cliente.trim().toLowerCase();
    });
    if (match && match.direccion && !this.formTicket.direccion) {
      this.formTicket.direccion = match.direccion;
    }
  }

  setFiltroEstado(estado: string) {
    this.filtroEstado = estado;
    this.pageTickets = 1;
  }

  cargarCatalogo() {
    if (this.catalogo.length > 0) return;
    this.catalogoService.getServicios().pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
      next: (res) => {
        this.catalogo = Array.isArray(res) ? res : ((res as any)?.data || []);
        this.cdr.detectChanges();
      },
      error: () => {
        this.catalogo = [];
        this.cdr.detectChanges();
      }
    });
  }

  cargarTickets(forzar = false) {
    if (this.cargando && !forzar) return;
    if (!forzar && this.tickets.length > 0) return;
    this.cargando = true;
    this.ticketsService.getTickets().pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
      next: (res) => {
        this.tickets = Array.isArray(res) ? res : ((res as any)?.data || []);
        this.filtrarTicketsPendientes();
        if (this.tecnicos.length > 0 && this.tecnicoDashboard) {
          const tec = this.tecnicos.find(t => t.id === this.tecnicoDashboard.id);
          if (tec) this.seleccionarTecnicoRender(tec);
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando tickets de servicios:', err);
        this.tickets = [];
        this.ticketsPendientes = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarInventario() {
    if (this.inventario.length > 0) return;
    this.inventarioService.getInventario().pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
      next: (res) => {
        this.inventario = res;
        this.cdr.detectChanges();
      },
      error: () => {
        this.inventario = [];
        this.cdr.detectChanges();
      }
    });
  }

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

        // Fallback: si no hay ninguno con filtro estricto pero hay empleados registrados, incluir empleados activos
        if (filtered.length === 0 && res.length > 0) {
          filtered = res;
        }

        this.tecnicos = filtered.map((e: any) => ({
          id: e.id,
          nombre: `${e.usuario?.primer_nombre || e.usuario?.nombres || ''} ${e.usuario?.primer_apellido || e.usuario?.apellidos || ''}`.trim() || e.nombre || `Empleado #${e.id}`,
          cargo: e.cargo?.nombre || e.puesto || 'Técnico Operativo',
          estado: e.estado
        })).filter((t: any) => t.nombre);

        if (this.tecnicos.length > 0) {
          this.seleccionarTecnicoRender(this.tecnicos[0]);
        } else {
          this.tecnicoDashboard = null;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.tecnicos = [];
        this.tecnicoDashboard = null;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para alternar entre pestañas del módulo de servicios
  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'recepcion' || tab === 'agenda' || tab === 'ejecucion' || tab === 'rendimiento') {
      if (this.tickets.length === 0) {
        this.cargarTickets();
      }
    }
    if (tab === 'ejecucion') {
      if (this.inventario.length === 0) {
        this.cargarInventario();
      }
    }
    if (tab === 'catalogo') {
      if (this.catalogo.length === 0) {
        this.cargarCatalogo();
      }
    }
  }

  // Bloque para obtener el nombre legible de un técnico por su ID
  nombreTecnico(id?: number): string {
    if (!id) return 'Sin Asignar';
    const tec = this.tecnicos.find(t => t.id === Number(id));
    return tec?.nombre || `Técnico #${id}`;
  }

  // Bloque para formatear el código visual de un servicio
  codigoServicio(id?: number): string {
    return `SERV-${String(id).padStart(3, '0')}`;
  }

  // Bloque para autocompletar la tarifa al seleccionar un servicio
  onServicioSeleccionado() {
    const s = this.catalogo.find(c => c.nombre === this.formTicket.servicio);
    if (s && s.tarifa) {
      this.formTicket.costo = s.tarifa;
    }
  }

  // Bloque para validar y registrar un nuevo ticket de servicio
  crearTicket() {
    if (!this.formTicket.cliente || !this.formTicket.servicio) {
      this.toast.warning('Complete cliente y servicio');
      return;
    }
    this.guardando = true;

    const estadoInicial = this.formTicket.tecnico_id 
      ? 'Asignado' 
      : (this.tipoServicio === 'TALLER' ? 'Recibido' : 'Pendiente');

    const ticket: ServicioTicket = {
      cliente_nombre: this.formTicket.cliente,
      servicio_requerido: this.formTicket.servicio,
      fecha_solicitada: this.formTicket.fecha || new Date().toISOString().split('T')[0],
      hora_sugerida: this.formTicket.hora || '09:00',
      direccion: this.tipoServicio === 'TALLER' ? 'Sede Central - Taller / Laboratorio' : (this.formTicket.direccion || 'A convenir con cliente'),
      estado: estadoInicial,
      tecnico_id: this.formTicket.tecnico_id ? Number(this.formTicket.tecnico_id) : undefined,
      equipo_recibido: this.tipoServicio === 'TALLER' ? this.formTicket.equipo : undefined,
      serie_equipo: this.tipoServicio === 'TALLER' ? this.formTicket.serie : undefined,
      accesorios_recibidos: this.tipoServicio === 'TALLER' ? this.formTicket.accesorios : undefined,
      falla_reportada: this.tipoServicio === 'TALLER' ? this.formTicket.falla : undefined,
      costo_total: this.formTicket.costo || 0
    };

    this.ticketsService.crearTicket(ticket).pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
      next: () => {
        this.toast.success(`Ticket registrado exitosamente en estado "${estadoInicial}"`);
        this.formTicket = { cliente: '', servicio: '', tecnico_id: null, fecha: '', hora: '', direccion: '', equipo: '', serie: '', accesorios: '', falla: '', costo: 0 };
        this.guardando = false;
        this.cargarTickets(true);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado al registrar ticket');
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

  pageSize = 8;
  pageTickets = 1;
  pageAgenda = 1;
  pageCatalogo = 1;

  // --- VARIABLES DE BÚSQUEDA ---
  searchTermTickets: string = '';
  searchTermAgenda: string = '';
  searchTermEjecucion: string = '';
  searchTermTecnicos: string = '';
  searchTermCatalogo: string = '';

  // Bloque para evento al cambiar término de búsqueda de tickets
  onSearchTermTicketsChange() {
    this.pageTickets = 1;
  }

  // Bloque para limpiar búsqueda en tickets
  limpiarBusquedaTickets() {
    this.searchTermTickets = '';
    this.pageTickets = 1;
  }

  // Bloque para evento al cambiar término de búsqueda de agenda
  onSearchTermAgendaChange() {
    this.pageAgenda = 1;
  }

  // Bloque para limpiar búsqueda en agenda
  limpiarBusquedaAgenda() {
    this.searchTermAgenda = '';
    this.pageAgenda = 1;
  }

  // Bloque para limpiar búsqueda en ejecución
  limpiarBusquedaEjecucion() {
    this.searchTermEjecucion = '';
  }

  // Bloque para limpiar búsqueda en técnicos
  limpiarBusquedaTecnicos() {
    this.searchTermTecnicos = '';
  }

  // --- GETTERS Y PAGINACION ---
  get paginatedTickets(): ServicioTicket[] {
    const list = this.getTicketsFiltrados();
    const start = (this.pageTickets - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }
  get totalPagesTickets(): number {
    return Math.ceil(this.getTicketsFiltrados().length / this.pageSize) || 1;
  }

  get agendaTickets(): ServicioTicket[] {
    let list = this.tickets.filter(tk => tk.estado !== 'Finalizado' && tk.estado !== 'Cancelado');
    if (this.searchTermAgenda.trim()) {
      const term = this.searchTermAgenda.trim().toLowerCase();
      list = list.filter(t => {
        const consecutivo = (t.consecutivo || '').toLowerCase();
        const cliente = (t.cliente_nombre || '').toLowerCase();
        const servicio = (t.servicio_requerido || '').toLowerCase();
        const direccion = (t.direccion || '').toLowerCase();
        const tecnico = this.nombreTecnico(t.tecnico_id).toLowerCase();
        const estado = (t.estado || '').toLowerCase();
        return (
          consecutivo.includes(term) ||
          cliente.includes(term) ||
          servicio.includes(term) ||
          direccion.includes(term) ||
          tecnico.includes(term) ||
          estado.includes(term)
        );
      });
    }
    return list;
  }
  get paginatedAgendaTickets(): ServicioTicket[] {
    const start = (this.pageAgenda - 1) * this.pageSize;
    return this.agendaTickets.slice(start, start + this.pageSize);
  }
  get totalPagesAgenda(): number {
    return Math.ceil(this.agendaTickets.length / this.pageSize) || 1;
  }

  // Bloque de evento al escribir en el buscador de servicios
  onSearchTermCatalogoChange() {
    this.pageCatalogo = 1;
  }

  // Bloque para restablecer el filtro de búsqueda del catálogo
  limpiarBusquedaCatalogo() {
    this.searchTermCatalogo = '';
    this.pageCatalogo = 1;
  }

  get catalogoFiltrado(): Servicio[] {
    if (!this.searchTermCatalogo.trim()) return this.catalogo;
    const term = this.searchTermCatalogo.trim().toLowerCase();
    return this.catalogo.filter(s => {
      const nombre = (s.nombre || '').toLowerCase();
      const desc = (s.descripcion || '').toLowerCase();
      const cod = this.codigoServicio(s.id).toLowerCase();
      return nombre.includes(term) || desc.includes(term) || cod.includes(term);
    });
  }

  get paginatedCatalogo(): Servicio[] {
    const start = (this.pageCatalogo - 1) * this.pageSize;
    return this.catalogoFiltrado.slice(start, start + this.pageSize);
  }
  get totalPagesCatalogo(): number {
    return Math.ceil(this.catalogoFiltrado.length / this.pageSize) || 1;
  }

  getTicketsFiltrados(): ServicioTicket[] {
    let list = this.tickets;
    if (this.filtroEstado !== 'TODOS') {
      list = list.filter(t => (t.estado || '').toLowerCase() === this.filtroEstado.toLowerCase());
    }
    if (this.searchTermTickets.trim()) {
      const term = this.searchTermTickets.trim().toLowerCase();
      list = list.filter(t => {
        const consecutivo = (t.consecutivo || '').toLowerCase();
        const cliente = (t.cliente_nombre || '').toLowerCase();
        const servicio = (t.servicio_requerido || '').toLowerCase();
        const direccion = (t.direccion || '').toLowerCase();
        const equipo = (t.equipo_recibido || '').toLowerCase();
        const serie = (t.serie_equipo || '').toLowerCase();
        const falla = (t.falla_reportada || '').toLowerCase();
        const tecnico = this.nombreTecnico(t.tecnico_id).toLowerCase();
        const estado = (t.estado || '').toLowerCase();
        return (
          consecutivo.includes(term) ||
          cliente.includes(term) ||
          servicio.includes(term) ||
          direccion.includes(term) ||
          equipo.includes(term) ||
          serie.includes(term) ||
          falla.includes(term) ||
          tecnico.includes(term) ||
          estado.includes(term)
        );
      });
    }
    return list;
  }

  get ticketsEjecucion(): ServicioTicket[] {
    let list = this.tickets.filter(
      tk => tk.estado === 'Asignado' || tk.estado === 'En Camino' || tk.estado === 'En Sitio' || tk.estado === 'Recibido'
    );
    if (this.searchTermEjecucion.trim()) {
      const term = this.searchTermEjecucion.trim().toLowerCase();
      list = list.filter(tk => {
        const c = (tk.consecutivo || '').toLowerCase();
        const cli = (tk.cliente_nombre || '').toLowerCase();
        const s = (tk.servicio_requerido || '').toLowerCase();
        const tec = this.nombreTecnico(tk.tecnico_id).toLowerCase();
        const eq = (tk.equipo_recibido || '').toLowerCase();
        const dir = (tk.direccion || '').toLowerCase();
        const falla = (tk.falla_reportada || '').toLowerCase();
        return (
          c.includes(term) ||
          cli.includes(term) ||
          s.includes(term) ||
          tec.includes(term) ||
          eq.includes(term) ||
          dir.includes(term) ||
          falla.includes(term)
        );
      });
    }
    return list;
  }

  get tecnicosFiltrados(): any[] {
    if (!this.searchTermTecnicos.trim()) return this.tecnicos;
    const term = this.searchTermTecnicos.trim().toLowerCase();
    return this.tecnicos.filter(tec => {
      const nom = (tec.nombre || '').toLowerCase();
      const cargo = (tec.cargo || '').toLowerCase();
      return nom.includes(term) || cargo.includes(term);
    });
  }

  // Bloque para determinar la clase visual del badge según el estado
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

  // Bloque para determinar el icono representativo del estado del ticket
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

  // Bloque de verificación de permisos administrativos para despachar técnicos
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

  // --- SECCION ASIGNACION Y DESPACHO ---
  // Bloque para abrir el modal de asignación de técnico a un ticket
  abrirAsignacion(tk: ServicioTicket) {
    if (!this.puedeAsignarOperarios()) {
      this.toast.warning('Solo el Jefe de Servicios y el Coordinador de Operativos pueden asignar o mover operarios.');
      return;
    }
    this.ticketSeleccionado = tk;
    this.tecnicoSeleccionado = tk.tecnico_id ? String(tk.tecnico_id) : '';
    this.modalAsignacion = true;
  }

  // Bloque para cerrar el modal de asignación
  cerrarAsignacion() {
    this.modalAsignacion = false;
    this.ticketSeleccionado = null;
  }

  // Bloque para persistir la asignación de técnico en el servicio
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
    this.ticketsService.actualizarEstado(this.ticketSeleccionado.id, nuevoEstado, Number(this.tecnicoSeleccionado)).pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
      next: () => {
        this.toast.success(`Servicio actualizado a "${nuevoEstado}" con técnico asignado.`);
        this.cerrarAsignacion();
        this.guardando = false;
        this.cargarTickets(true);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado al asignar');
        } else {
          this.toast.error('Error al asignar técnico');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para actualizar directamente el estado operativo de un ticket
  cambiarEstadoDirecto(tk: ServicioTicket, nuevoEstado: string) {
    if (!tk.id) return;
    this.guardando = true;
    this.ticketsService.actualizarEstado(tk.id, nuevoEstado, tk.tecnico_id).pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
      next: () => {
        this.toast.success(`Servicio actualizado a "${nuevoEstado}".`);
        this.guardando = false;
        this.cargarTickets(true);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Error al actualizar estado del servicio.');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- SECCION EJECUCION Y MINI INVENTARIO ---
  // Bloque para abrir el modal de ejecución y mini-inventario
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

  // Bloque para cerrar el modal de ejecución
  cerrarEjecucion() {
    this.modalEjecucion = false;
    this.ticketSeleccionado = null;
  }

  // Bloque para obtener el nombre de un repuesto según su ID
  nombreProducto(id: number): string {
    const inv = this.inventario.find(i => i.producto_id === id);
    return inv?.producto?.nombre || `Producto #${id}`;
  }

  // Bloque para consultar el stock disponible de un repuesto
  stockProducto(id: number): number {
    const inv = this.inventario.find(i => i.producto_id === id);
    return inv?.stock_actual || 0;
  }

  // Bloque para consultar el precio unitario de un repuesto
  precioProducto(id: number): number {
    const inv = this.inventario.find(i => i.producto_id === id);
    return Number(inv?.producto?.precio || 0);
  }

  // Bloque para descontar y asignar un material/repuesto al servicio
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

    this.ticketsService.agregarMaterial(this.ticketSeleccionado.id, nuevoMaterial).pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
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

  // Bloque para remover un material asignado al servicio
  eliminarMaterial(mat: ServicioMaterial, index: number) {
    if (!this.ticketSeleccionado?.id || !mat.id) {
      this.materialesUsados.splice(index, 1);
      return;
    }

    this.ticketsService.eliminarMaterial(this.ticketSeleccionado.id, mat.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
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

  // Bloque para calcular la sumatoria de costos de materiales usados
  getTotalMateriales(): number {
    return this.materialesUsados.reduce((acc, m) => acc + (m.subtotal || (m.cantidad * (m.precio_unitario || 0))), 0);
  }

  // Bloque para calcular el costo total sumando mano de obra y materiales
  getCostoTotalCalculado(): number {
    return (Number(this.costoManoObra) || 0) + this.getTotalMateriales();
  }

  // Bloque para liquidar, finalizar y registrar calificaciones de un servicio
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
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout(35000)
      )
      .subscribe({
        next: () => {
          this.toast.success('¡Servicio finalizado con éxito! Materiales descontados de inventario y calificaciones registradas.');
          this.cerrarEjecucion();
          this.guardando = false;
          this.cargarTickets(true);
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

  // --- SECCION CALIFICACION MUTUA ---
  // Bloque para abrir el diálogo de calificación mutua
  abrirModalCalificacion(tk: ServicioTicket) {
    this.ticketParaCalificar = tk;
    this.calificacionTecnico = tk.calificacion_tecnico || 5;
    this.feedbackTecnico = tk.feedback_tecnico || '';
    this.calificacionCliente = tk.calificacion_cliente || 5;
    this.feedbackCliente = tk.feedback_cliente || '';
    this.modalCalificacion = true;
  }

  // Bloque para cerrar el modal de calificación
  cerrarModalCalificacion() {
    this.modalCalificacion = false;
    this.ticketParaCalificar = null;
  }

  // Bloque para fijar las estrellas otorgadas al técnico
  setStarsTecnico(n: number) {
    this.calificacionTecnico = n;
  }

  // Bloque para fijar las estrellas otorgadas al cliente
  setStarsCliente(n: number) {
    this.calificacionCliente = n;
  }

  // Bloque para enviar la calificación al servidor
  guardarCalificacion() {
    if (!this.ticketParaCalificar?.id) return;
    this.guardando = true;

    this.ticketsService.calificarTicket(this.ticketParaCalificar.id, {
      calificacion_tecnico: this.calificacionTecnico,
      feedback_tecnico: this.feedbackTecnico,
      calificacion_cliente: this.calificacionCliente,
      feedback_cliente: this.feedbackCliente
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      timeout(35000)
    ).subscribe({
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

  // --- SECCION RENDIMIENTO TECNICO ---
  // Bloque para calcular y proyectar métricas de desempeño del técnico
  seleccionarTecnicoRender(tec: any) {
    const ticketsTec = this.tickets.filter(t => t.tecnico_id === tec.id);
    const finalizados = ticketsTec.filter(t => t.estado === 'Finalizado');
    const enCamino = ticketsTec.filter(t => t.estado === 'En Camino').length;
    const enSitio = ticketsTec.filter(t => t.estado === 'En Sitio').length;
    const asignados = ticketsTec.filter(t => t.estado === 'Asignado').length;
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

  // Bloque utilitario para calcular porcentajes de cumplimiento
  getPorcentaje(valor: number, total: number = 100): number {
    if (total <= 0) return 0;
    return Math.min(Math.round((valor / total) * 100), 100);
  }

  // Bloque utilitario para generar arreglo de estrellas numéricas
  getStarArray(n: number = 5): number[] {
    return Array.from({ length: Math.round(n) }, (_, i) => i + 1);
  }
}
