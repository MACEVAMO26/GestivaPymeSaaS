import { VolverDirective } from '../../../../../shared/directives/volver.directive';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompraService } from '../../../../../services/compra.service';
import { ProveedorService, Proveedor } from '../../../../../services/proveedor.service';
import { ProductoService, Producto } from '../../../../../services/producto.service';
import { ToastService } from '../../../../../services/toast.service';
import { AuthService } from '../../../../../services/auth.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, VolverDirective],
  templateUrl: './compras.component.html',
  styleUrl: './compras.component.scss'
})
export class ComprasComponent implements OnInit {
  private compraService = inject(CompraService);
  private proveedorService = inject(ProveedorService);
  private productoService = inject(ProductoService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  // --- VARIABLES DE ESTADO ---
  activeTab: string = 'ordenes';
  cargando = false;
  guardando = false;

  searchTerm: string = '';

  ordenes: any[] = [];
  ordenesFiltradas: any[] = [];
  proveedoresDisponibles: Proveedor[] = [];
  productosDisponibles: Producto[] = [];
  recepciones: any[] = [];
  showModalDetalleOrden: boolean = false;
  ordenSeleccionadaDetalle: any = null;
  anulandoId: number | null = null;
  ordenSeleccionadaRecepcion: any = null;
  showModalRecepcion: boolean = false;
  showModalOrden: boolean = false;
  formOrden: any = this.// Bloque para restablecer los valores del formulario de compras
  resetFormOrden();
  productoActualCompra: any = '';
  cantidadActualCompra: number = 1;
  precioActualCompra: number = 0;
  carritoCompras: any[] = [];
  pageSize: number = 8;
  pageOrdenes: number = 1;
  pageRecepcion: number = 1;
  Math = Math;

  // --- GETTERS Y PAGINACION ---
  get paginatedOrdenes(): any[] {
    const start = (this.pageOrdenes - 1) * this.pageSize;
    return this.ordenesFiltradas.slice(start, start + this.pageSize);
  }
  get totalPagesOrdenes(): number {
    return Math.ceil(this.ordenesFiltradas.length / this.pageSize) || 1;
  }

  get paginatedRecepciones(): any[] {
    const start = (this.pageRecepcion - 1) * this.pageSize;
    return this.recepciones.slice(start, start + this.pageSize);
  }
  get totalPagesRecepciones(): number {
    return Math.ceil(this.recepciones.length / this.pageSize) || 1;
  }

  // Bloque de ciclo de vida OnInit para cargar el catálogo inicial de compras
  ngOnInit() {
    this.// Bloque para consultar órdenes de compra, productos y proveedores desde la API
  cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.proveedorService.getProveedores().pipe(timeout(15000)).subscribe({
      next: (res) => { this.proveedoresDisponibles = res; this.cdr.detectChanges(); },
      error: () => { this.proveedoresDisponibles = []; this.cdr.detectChanges(); }
    });

    this.productoService.getProductos().pipe(timeout(15000)).subscribe({
      next: (res) => { this.productosDisponibles = res.filter(p => p.activo !== false); this.cdr.detectChanges(); },
      error: () => { this.productosDisponibles = []; this.cdr.detectChanges(); }
    });

    this.compraService.getOrdenes().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.ordenes = res;
        this.// Bloque para filtrar órdenes de compra por término de búsqueda
  filtrarOrdenes();
        this.cdr.detectChanges();
      },
      error: () => {
        this.ordenes = [];
        this.ordenesFiltradas = [];
        this.cdr.detectChanges();
      }
    });

    this.compraService.getRecepciones().pipe(timeout(15000)).subscribe({
      next: (res) => { this.recepciones = res; this.cdr.detectChanges(); },
      error: () => { this.recepciones = []; this.cdr.detectChanges(); },
      complete: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  // Bloque utilitario para formatear el consecutivo de la orden de compra
  numeroOrden(orden: any): string {
    return 'OC-' + String(orden.id ?? '').padStart(4, '0');
  }

  // Bloque utilitario para resolver el nombre del proveedor asociado
  nombreProveedor(orden: any): string {
    return orden.proveedor?.razon_social || orden.proveedor?.nombre_comercial || orden.proveedor?.nombre || '-';
  }

  // Bloque utilitario para determinar el estado de la orden
  estadoOrden(orden: any): string {
    const e = orden.estado || '';
    if (e === 'recibida' || e === 'recibida_total' || e === 'Recibido') return 'Recibido';
    if (e === 'recibida_parcial') return 'Recibido Parcial';
    if (e === 'aprobada' || e === 'Aprobado') return 'Aprobado';
    if (e === 'anulada' || e === 'Anulado' || e === 'rechazada') return 'Anulado';
    return 'Pendiente';
  }

  // Bloque para asignar la clase cromática del badge según el estado
  getBadgeClass(estado: string): string {
    if (estado === 'Recibido' || estado === 'Aprobado') return 'badge-aprobada';
    if (estado === 'Recibido Parcial') return 'badge-secundario';
    if (estado === 'Anulado') return 'badge-rechazada';
    return 'badge-pendiente';
  }

  // Bloque para alternar entre pestañas de compras
  switchTab(tab: string) {
    this.activeTab = tab;
  }

  filtrarOrdenes() {
    if (!this.searchTerm) {
      this.ordenesFiltradas = [...this.ordenes];
      this.pageOrdenes = 1;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.ordenesFiltradas = this.ordenes.filter(o =>
      this.numeroOrden(o).toLowerCase().includes(term) ||
      this.nombreProveedor(o).toLowerCase().includes(term)
    );
    this.pageOrdenes = 1;
  }

  // --- SECCION MODAL ORDEN ---
  // Bloque para abrir el formulario de nueva orden de compra
  abrirModalOrden() {
    this.formOrden = this.resetFormOrden();
    this.carritoCompras = [];
    this.productoActualCompra = '';
    this.cantidadActualCompra = 1;
    this.precioActualCompra = 0;
    this.showModalOrden = true;
  }

  // Bloque para cerrar el modal de orden de compra
  cerrarModalOrden() {
    this.showModalOrden = false;
  }

  resetFormOrden() {
    return {
      proveedor: '',
      fechaEsperada: '',
      total: 0,
      observaciones: ''
    };
  }

  // Bloque para anexar un producto con cantidad y costo al pedido de compra
  agregarAlCarrito() {
    if (!this.productoActualCompra || this.cantidadActualCompra <= 0 || this.precioActualCompra <= 0) {
      this.toast.warning('Debe seleccionar producto, cantidad y precio');
      return;
    }

    const producto = this.productosDisponibles.find(p => p.id == this.productoActualCompra);
    if (!producto) return;

    const subtotal = this.cantidadActualCompra * this.precioActualCompra;

    this.carritoCompras.push({
      id: producto.id,
      nombre: producto.nombre,
      cantidad: this.cantidadActualCompra,
      precio_compra: this.precioActualCompra,
      subtotal: subtotal
    });

    this.formOrden.total += subtotal;

    this.productoActualCompra = '';
    this.cantidadActualCompra = 1;
    this.precioActualCompra = 0;
  }

  // Bloque para eliminar un ítem del listado preliminar de compra
  removerDelCarrito(idx: number) {
    const item = this.carritoCompras[idx];
    this.formOrden.total -= item.subtotal;
    this.carritoCompras.splice(idx, 1);
  }

  // Bloque para validar y registrar la orden de compra en el sistema
  guardarOrden() {
    if (!this.formOrden.proveedor || this.carritoCompras.length === 0) {
      this.toast.warning('Debe seleccionar proveedor y agregar productos');
      return;
    }

    this.guardando = true;
    const payload = {
      proveedor_id: Number(this.formOrden.proveedor),
      usuario_id: this.authService.getUser()?.id,
      fecha_requerida: this.formOrden.fechaEsperada || new Date().toISOString().substring(0, 10),
      detalles: this.carritoCompras.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_compra
      }))
    };

    this.compraService.crearOrden(payload).pipe(timeout(15000)).subscribe({
      next: () => {
        this.toast.success('Orden de compra generada');
        this.cerrarModalOrden();
        this.guardando = false;
        this.cargarDatos();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al generar la orden.');
        } else {
          this.toast.error('Error al generar la orden de compra');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- SECCION RECEPCION ---
  // Bloque para abrir el modal de recepción de mercancía
  abrirModalRecepcion() {
    if (!this.ordenSeleccionadaRecepcion || this.ordenSeleccionadaRecepcion === 'null') {
      this.toast.warning('Debe seleccionar una orden pendiente');
      return;
    }
    this.showModalRecepcion = true;
  }

  // Bloque para cerrar el diálogo de recepción
  cerrarModalRecepcion() {
    this.showModalRecepcion = false;
  }

  // Bloque para confirmar la recepción de mercancía e incrementar el stock
  recibirOrden() {
    const orden = this.ordenes.find(o => o.id == this.ordenSeleccionadaRecepcion);
    if (!orden) {
      this.toast.error('Orden no encontrada');
      return;
    }

    const detalles = (orden.detalles || []).map((d: any) => ({
      producto_id: d.producto_id,
      cantidad_recibida: d.cantidad,
      estado_calidad: 'Bueno'
    }));

    this.guardando = true;
    const payload = {
      orden_compra_id: orden.id,
      usuario_id: this.authService.getUser()?.id,
      fecha_recepcion: new Date().toISOString().substring(0, 10),
      observaciones: 'Recepción de mercancía',
      detalles
    };

    this.compraService.crearRecepcion(payload).pipe(timeout(15000)).subscribe({
      next: () => {
        this.toast.success('Mercancía ingresada correctamente al stock');
        this.cerrarModalRecepcion();
        this.ordenSeleccionadaRecepcion = null;
        this.guardando = false;
        this.cargarDatos();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al registrar recepción.');
        } else {
          this.toast.error('Error al registrar la recepción');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para autocompletar el costo de compra al seleccionar un producto
  alCambiarProducto() {
    const prod = this.productosDisponibles.find(p => p.id == this.productoActualCompra);
    if (prod && prod.precio_compra) {
      this.precioActualCompra = Number(prod.precio_compra);
    }
  }

  // Bloque para consultar y proyectar el detalle de ítems de una orden
  verDetalle(orden: any) {
    this.ordenSeleccionadaDetalle = orden;
    this.showModalDetalleOrden = true;
  }

  // Bloque para cerrar el modal de detalle de orden
  cerrarModalDetalle() {
    this.showModalDetalleOrden = false;
    this.ordenSeleccionadaDetalle = null;
  }

  // Bloque para solicitar o ejecutar la anulación de una orden de compra
  anularOrden(orden: any) {
    if (!orden?.id) return;
    this.anulandoId = orden.id;
    this.compraService.anularOrden(orden.id).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success(`Orden ${this.numeroOrden(orden)} anulada correctamente`);
        this.anulandoId = null;
        this.cargarDatos();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.anulandoId = null;
        this.toast.error(err.error?.message || 'Error al anular la orden');
        this.cdr.detectChanges();
      }
    });
  }
}