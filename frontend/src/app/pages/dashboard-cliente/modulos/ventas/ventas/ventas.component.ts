import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { VentaService, Venta } from '../../../../../services/venta.service';
import { ClienteService, Cliente } from '../../../../../services/cliente.service';
import { CajaService, Caja } from '../../../../../services/caja.service';
import { ProductoService, Producto } from '../../../../../services/producto.service';
import { ToastService } from '../../../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.scss'
})
export class VentasComponent implements OnInit {
  private ventaService = inject(VentaService);
  private clienteService = inject(ClienteService);
  private cajaService = inject(CajaService);
  private productoService = inject(ProductoService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  activeTab: string = 'pos';

  // Variables POS
  clienteSeleccionado: number | '' = '';
  clientesDisponibles: Cliente[] = [];

  productoActual: any = '';
  productosDisponibles: Producto[] = [];

  cantidadActual: number = 1;
  metodoPago: string = 'efectivo';
  carrito: any[] = [];
  totalCarrito: number = 0;

  guardando: boolean = false;
  cargando: boolean = false;
  cajas: Caja[] = [];

  // Variables Historial
  searchTerm: string = '';
  ventas: any[] = [];
  ventasFiltradas: any[] = [];

  // Variables Modal Anulación
  showModalAnular: boolean = false;
  ventaSeleccionada: any = null;

  ngOnInit() {
    this.cargarDatosBase();
    this.cargarVentas();
  }

  cargarDatosBase() {
    this.cargando = true;
    this.clienteService.getClientes().pipe(timeout(15000)).subscribe({
      next: (res) => { this.clientesDisponibles = res; this.cdr.detectChanges(); },
      error: () => { this.clientesDisponibles = []; this.cdr.detectChanges(); }
    });

    this.productoService.getProductos().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.productosDisponibles = res.filter(p => p.activo !== false);
        this.cdr.detectChanges();
      },
      error: () => { this.productosDisponibles = []; this.cdr.detectChanges(); }
    });

    this.cajaService.getCajas().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.cajas = res.filter(c => c.estado === 'abierta');
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cajas = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarVentas() {
    this.ventaService.getVentas().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.ventas = res;
        this.filtrarVentas();
        this.cdr.detectChanges();
      },
      error: () => {
        this.ventas = [];
        this.ventasFiltradas = [];
        this.toast.error('Error al cargar el historial de ventas');
        this.cdr.detectChanges();
      }
    });
  }

  filtrarVentas() {
    const term = this.searchTerm.toLowerCase();
    this.ventasFiltradas = this.ventas.filter(v =>
      (v.factura_consecutivo?.toString() || '').includes(term) ||
      v.cliente?.nombres?.toLowerCase().includes(term) ||
      v.cliente?.apellidos?.toLowerCase().includes(term)
    );
  }

  numeroFactura(venta: any): string {
    return 'FAC-' + String(venta.factura_consecutivo ?? venta.id ?? '').padStart(3, '0');
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  exportarExcel() {
    this.toast.success('Generando archivo Excel...');
    const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}` };
    this.http.get('/api/export/ventas', { headers, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ventas_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success('Excel de ventas descargado');
      },
      error: () => this.toast.error('Error al exportar. Intenta nuevamente.')
    });
  }

  agregarAlCarrito() {
    if (!this.productoActual || this.cantidadActual <= 0) {
      this.toast.warning('Seleccione un producto y cantidad válida');
      return;
    }

    const prod = this.productosDisponibles.find(p => p.id == this.productoActual);
    if (prod) {
      // Forzar precio a número para evitar error string + int en backend
      const precioUnitario = +prod.precio_venta;
      const cantidad = +this.cantidadActual;

      const existente = this.carrito.find(item => item.id == prod.id);
      if (existente) {
        existente.cantidad += cantidad;
        existente.subtotal = existente.precio_unitario * existente.cantidad;
      } else {
        this.carrito.push({
          id: prod.id,
          nombre: prod.nombre,
          precio_unitario: precioUnitario,
          cantidad: cantidad,
          subtotal: precioUnitario * cantidad
        });
      }
      this.calcularTotales();
      this.productoActual = '';
      this.cantidadActual = 1;
    }
  }

  removerDelCarrito(index: number) {
    this.carrito.splice(index, 1);
    this.calcularTotales();
  }

  calcularTotales() {
    this.totalCarrito = this.carrito.reduce((acc, item) => acc + item.subtotal, 0);
  }

  registrarVenta() {
    if (!this.clienteSeleccionado) {
      this.toast.warning('Debe seleccionar un cliente');
      return;
    }
    if (this.carrito.length === 0) {
      this.toast.warning('El carrito está vacío');
      return;
    }

    this.guardando = true;
    const payload: any = {
      cliente_id: this.clienteSeleccionado,
      metodo_pago: this.metodoPago,
      productos: this.carrito.map(item => ({
        id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario
      }))
    };

    this.ventaService.registrarVenta(payload).pipe(timeout(15000)).subscribe({
      next: () => {
        this.toast.success('Venta registrada con éxito');
        this.guardando = false;
        this.carrito = [];
        this.calcularTotales();
        this.clienteSeleccionado = '';
        this.cargarVentas();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.guardando = false;
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al registrar la venta.');
        } else {
          this.toast.error(err.error?.message || 'Error al registrar la venta');
        }
        this.cdr.detectChanges();
      }
    });
  }

  getBadgeClass(estado: string): string {
    if (estado === 'Completada') return 'badge-aprobada';
    if (estado === 'Anulada') return 'badge-rechazada';
    return 'badge-pendiente';
  }

  cambiarEstadoPaquete(venta: any, nuevoEstado: string) {
    if (!venta?.id || !venta.cliente_id) return;
    this.ventaService.updateEstadoPaquete(venta.id, nuevoEstado, venta.cliente_id).pipe(timeout(10000)).subscribe({
      next: () => {
        venta.estado_paquete = nuevoEstado;
        this.toast.success('Estado del paquete actualizado');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al actualizar paquete.');
        } else {
          this.toast.error('Error al actualizar el estado del paquete');
        }
        this.cdr.detectChanges();
      }
    });
  }

  abrirModalAnular(venta: any) {
    this.ventaSeleccionada = venta;
    this.showModalAnular = true;
  }

  cerrarModalAnular() {
    this.showModalAnular = false;
    this.ventaSeleccionada = null;
  }

  confirmarAnulacion() {
    if (!this.ventaSeleccionada?.id) return;
    this.guardando = true;
    this.ventaService.anularVenta(this.ventaSeleccionada.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.toast.success('Venta anulada correctamente');
        this.guardando = false;
        this.cerrarModalAnular();
        this.cargarVentas();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.guardando = false;
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al anular venta.');
        } else {
          this.toast.error(err.error?.message || 'Error al anular la venta');
        }
        this.cdr.detectChanges();
      }
    });
  }
}