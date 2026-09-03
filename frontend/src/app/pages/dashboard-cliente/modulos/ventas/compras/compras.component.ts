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
  imports: [CommonModule, FormsModule],
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

  activeTab: string = 'ordenes';
  cargando = false;
  guardando = false;

  searchTerm: string = '';

  ordenes: any[] = [];
  ordenesFiltradas: any[] = [];
  proveedoresDisponibles: Proveedor[] = [];
  productosDisponibles: Producto[] = [];
  recepciones: any[] = [];

  // Variables Detalle Orden
  showModalDetalleOrden: boolean = false;
  ordenSeleccionadaDetalle: any = null;
  anulandoId: number | null = null;

  // Variables Recepcion
  ordenSeleccionadaRecepcion: any = null;
  showModalRecepcion: boolean = false;

  // Variables Orden de Compra
  showModalOrden: boolean = false;
  formOrden: any = this.resetFormOrden();
  productoActualCompra: any = '';
  cantidadActualCompra: number = 1;
  precioActualCompra: number = 0;
  carritoCompras: any[] = [];

  ngOnInit() {
    this.cargarDatos();
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
        this.filtrarOrdenes();
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

  numeroOrden(orden: any): string {
    return 'OC-' + String(orden.id ?? '').padStart(4, '0');
  }

  nombreProveedor(orden: any): string {
    return orden.proveedor?.razon_social || orden.proveedor?.nombre || '-';
  }

  estadoOrden(orden: any): string {
    const e = orden.estado || '';
    if (e === 'recibida' || e === 'recibida_total' || e === 'Recibido') return 'Recibido';
    if (e === 'recibida_parcial') return 'Recibido Parcial';
    if (e === 'aprobada' || e === 'Aprobado') return 'Aprobado';
    if (e === 'anulada' || e === 'Anulado' || e === 'rechazada') return 'Anulado';
    return 'Pendiente';
  }

  getBadgeClass(estado: string): string {
    if (estado === 'Recibido' || estado === 'Aprobado') return 'badge-aprobada';
    if (estado === 'Recibido Parcial') return 'badge-secundario';
    if (estado === 'Anulado') return 'badge-rechazada';
    return 'badge-pendiente';
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  filtrarOrdenes() {
    if (!this.searchTerm) {
      this.ordenesFiltradas = [...this.ordenes];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.ordenesFiltradas = this.ordenes.filter(o =>
      this.numeroOrden(o).toLowerCase().includes(term) ||
      this.nombreProveedor(o).toLowerCase().includes(term)
    );
  }

  // --- LOGICA MODAL ORDEN ---
  abrirModalOrden() {
    this.formOrden = this.resetFormOrden();
    this.carritoCompras = [];
    this.productoActualCompra = '';
    this.cantidadActualCompra = 1;
    this.precioActualCompra = 0;
    this.showModalOrden = true;
  }

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

  removerDelCarrito(idx: number) {
    const item = this.carritoCompras[idx];
    this.formOrden.total -= item.subtotal;
    this.carritoCompras.splice(idx, 1);
  }

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

  // --- LOGICA RECEPCION ---
  abrirModalRecepcion() {
    if (!this.ordenSeleccionadaRecepcion || this.ordenSeleccionadaRecepcion === 'null') {
      this.toast.warning('Debe seleccionar una orden pendiente');
      return;
    }
    this.showModalRecepcion = true;
  }

  cerrarModalRecepcion() {
    this.showModalRecepcion = false;
  }

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

  alCambiarProducto() {
    const prod = this.productosDisponibles.find(p => p.id == this.productoActualCompra);
    if (prod && prod.precio_compra) {
      this.precioActualCompra = Number(prod.precio_compra);
    }
  }

  verDetalle(orden: any) {
    this.ordenSeleccionadaDetalle = orden;
    this.showModalDetalleOrden = true;
  }

  cerrarModalDetalle() {
    this.showModalDetalleOrden = false;
    this.ordenSeleccionadaDetalle = null;
  }

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