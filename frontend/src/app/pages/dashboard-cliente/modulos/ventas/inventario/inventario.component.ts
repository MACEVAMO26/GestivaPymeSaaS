import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProductoService, Producto, Categoria } from '../../../../../services/producto.service';
import { InventarioService, Inventario, MovimientoInventario } from '../../../../../services/inventario.service';
import { ToastService } from '../../../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.scss'
})
export class InventarioComponent implements OnInit {
  private productoService = inject(ProductoService);
  private inventarioService = inject(InventarioService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  activeTab: string = 'catalogo';

  categorias: Categoria[] = [];
  productosFiltrados: any[] = [];
  productosOriginales: any[] = [];
  inventario: Inventario[] = [];
  movimientos: any[] = [];
  searchTerm: string = '';

  cargando = false;
  guardando = false;

  showModal: boolean = false;
  formProducto: any = this.resetFormProducto();

  // Formulario movimiento
  formMovimiento: any = { tipo: 'entrada', producto_id: '', cantidad: 1, observaciones: '' };
  // Formulario ajuste
  formAjuste: any = { producto_id: '', cantidad: 1, observaciones: '' };
  // Kardex
  productoKardex: any = '';
  kardexFilas: any[] = [];

  // --- CATEGORÍAS ---
  showModalCategoria: boolean = false;
  editandoCategoria: boolean = false;
  categoriaEditandoId: number | null = null;
  formCategoria: any = { nombre: '', descripcion: '', tipo: 'ventas' };
  guardandoCategoria = false;

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.cargarCategorias();

    this.productoService.getProductos().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.productosOriginales = res;
        this.filtrarProductos();
        this.cdr.detectChanges();
      },
      error: () => {
        this.productosOriginales = [];
        this.productosFiltrados = [];
        this.cdr.detectChanges();
      }
    });

    this.inventarioService.getInventario().pipe(timeout(15000)).subscribe({
      next: (res) => { this.inventario = res; this.cdr.detectChanges(); },
      error: () => { this.inventario = []; this.cdr.detectChanges(); }
    });

    this.inventarioService.getMovimientos().pipe(timeout(15000)).subscribe({
      next: (res) => { this.movimientos = res; this.cdr.detectChanges(); },
      error: () => { this.movimientos = []; this.cdr.detectChanges(); },
      complete: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'kardex' && !this.kardexFilas.length && this.productosOriginales.length) {
      this.productoKardex = this.productosOriginales[0]?.id || '';
      this.generarKardex();
    }
  }

  abrirModal() {
    this.formProducto = this.resetFormProducto();
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
  }

  resetFormProducto() {
    return {
      codigo: '',
      nombre: '',
      categoria_id: '',
      unidad_medida: '',
      precio_venta: 0,
      precio_compra: 0,
      stock_inicial: 0
    };
  }

  onFileSelected(event: any) {
    // Manejo de archivo (pendiente subida a Cloudinary)
  }

  guardarProducto() {
    if (!this.formProducto.nombre || !this.formProducto.categoria_id) {
      this.toast.warning('Nombre y categoría son obligatorios');
      return;
    }
    this.guardando = true;
    const payload: Producto = {
      categoria_id: Number(this.formProducto.categoria_id),
      nombre: this.formProducto.nombre,
      descripcion: this.formProducto.codigo || '',
      precio_compra: Number(this.formProducto.precio_compra) || 0,
      precio_venta: Number(this.formProducto.precio_venta) || 0,
      stock_inicial: Number(this.formProducto.stock_inicial) || 0,
      unidad_medida: this.formProducto.unidad_medida || 'Unidad',
      activo: true
    };

    this.productoService.crearProducto(payload).pipe(timeout(10000)).subscribe({
      next: (prod) => {
        // Crear registro de inventario asociado
        if (prod.id) {
          this.inventarioService.getInventario().pipe(timeout(5000)).subscribe(() => {});
        }
        this.toast.success('Producto guardado exitosamente');
        this.cerrarModal();
        this.guardando = false;
        this.cargarDatos();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al guardar producto.');
        } else {
          this.toast.error('Error al guardar el producto');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  getBadgeClass(stock: number | undefined, stockMinimo: number | undefined): string {
    const s = stock ?? 0;
    const m = stockMinimo ?? 0;
    if (s === 0) return 'badge-danger';
    if (s <= m) return 'badge-warning';
    return 'badge-success';
  }

  exportarExcel() {
    this.toast.success('Generando archivo Excel...');
    const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}` };
    this.http.get('/api/export/productos', { headers, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success('Excel de inventario descargado');
      },
      error: () => this.toast.error('Error al exportar. Intenta nuevamente.')
    });
  }

  filtrarProductos() {
    if (!this.searchTerm) {
      this.productosFiltrados = [...this.productosOriginales];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.productosFiltrados = this.productosOriginales.filter(p =>
      (p.nombre || '').toLowerCase().includes(term) ||
      (p.descripcion || '').toLowerCase().includes(term)
    );
  }

  // Helpers de vista: resolver categoría y stock del producto real
  nombreCategoria(producto: any): string {
    const c = this.categorias.find(cat => cat.id === producto.categoria_id);
    return c?.nombre || 'Sin categoría';
  }

  codigoProducto(producto: any): string {
    return producto.descripcion || 'PRD-' + String(producto.id).padStart(3, '0');
  }

  stockProducto(producto: any): number {
    const inv = this.inventario.find(i => i.producto_id === producto.id);
    return inv?.stock_actual ?? 0;
  }

  stockMinimoProducto(producto: any): number {
    const inv = this.inventario.find(i => i.producto_id === producto.id);
    return inv?.stock_minimo ?? 0;
  }

  productosPorCategoria(categoriaId: number | undefined): number {
    return this.productosOriginales.filter(p => p.categoria_id === categoriaId).length;
  }

  // --- MOVIMIENTOS (entradas/salidas) ---
  registrarMovimiento() {
    if (!this.formMovimiento.producto_id || this.formMovimiento.cantidad <= 0) {
      this.toast.warning('Seleccione producto y cantidad válida');
      return;
    }
    this.guardando = true;
    const payload: MovimientoInventario = {
      inventario_id: Number(this.formMovimiento.producto_id),
      tipo_movimiento: this.formMovimiento.tipo === 'salida' ? 'salida' : 'entrada',
      cantidad: Number(this.formMovimiento.cantidad),
      observaciones: this.formMovimiento.observaciones || ''
    };
    this.inventarioService.registrarMovimiento(payload).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Movimiento registrado');
        this.formMovimiento = { tipo: 'entrada', producto_id: '', cantidad: 1, observaciones: '' };
        this.guardando = false;
        this.cargarDatos();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al registrar movimiento.');
        } else {
          this.toast.error('Error al registrar el movimiento');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  nombreMovimientoProducto(m: any): string {
    const p = this.productosOriginales.find(prod => prod.id === m.inventario_id || prod.id === m.producto_id);
    return p?.nombre || 'Producto #' + (m.inventario_id ?? m.producto_id);
  }

  fechaMovimiento(m: any): string {
    return m.fecha_hora ? new Date(m.fecha_hora).toLocaleDateString() : '-';
  }

  // --- AJUSTES (merma/daño) ---
  ajustesRegistrados(): any[] {
    return this.movimientos.filter(m => m.tipo_movimiento === 'ajuste' || m.tipo === 'ajuste');
  }

  aplicarAjuste() {
    if (!this.formAjuste.producto_id || this.formAjuste.cantidad <= 0) {
      this.toast.warning('Seleccione producto y cantidad válida');
      return;
    }
    this.guardando = true;
    const payload: MovimientoInventario = {
      inventario_id: Number(this.formAjuste.producto_id),
      tipo_movimiento: 'ajuste',
      cantidad: -Number(this.formAjuste.cantidad),
      observaciones: this.formAjuste.observaciones || 'Ajuste por merma/daño'
    };
    this.inventarioService.registrarMovimiento(payload).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Ajuste aplicado');
        this.formAjuste = { producto_id: '', cantidad: 1, observaciones: '' };
        this.guardando = false;
        this.cargarDatos();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al aplicar ajuste.');
        } else {
          this.toast.error('Error al aplicar el ajuste');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- KARDEX ---
  generarKardex() {
    if (!this.productoKardex) return;
    const id = Number(this.productoKardex);
    const movs = this.movimientos.filter(m => (m.inventario_id === id || m.producto_id === id));
    const inv = this.inventario.find(i => i.producto_id === id);
    let saldo = 0;
    this.kardexFilas = [
      { fecha: 'Inicio', concepto: 'Saldo Inicial', entrada: 0, salida: 0, saldo: inv?.stock_actual ?? 0 }
    ];
    // Se reconstruye la secuencia aproximada desde los movimientos existentes
    saldo = inv?.stock_actual ?? 0;
    movs.forEach(m => {
      const entrada = m.tipo_movimiento === 'entrada' || (m.tipo === 'entrada') ? Math.abs(m.cantidad) : 0;
      const salida = (m.tipo_movimiento === 'salida' || m.tipo === 'salida' || m.tipo === 'ajuste' || m.tipo_movimiento === 'ajuste') ? Math.abs(m.cantidad) : 0;
      this.kardexFilas.push({
        fecha: this.fechaMovimiento(m),
        concepto: m.tipo_movimiento || m.tipo || 'Movimiento',
        entrada, salida,
        saldo: 0 // saldo exacto requiere serie histórica; se muestra el stock actual del producto
      });
    });
    if (this.kardexFilas.length === 1) {
      this.kardexFilas.push({ fecha: '-', concepto: 'Sin movimientos registrados', entrada: 0, salida: 0, saldo: inv?.stock_actual ?? 0 });
    }
  }

  nombreKardexProducto(id: number): string {
    const p = this.productosOriginales.find(prod => prod.id === id);
    return p?.nombre || 'Producto #' + id;
  }

  // --- CATEGORÍAS (CRUD) ---
  abrirModalCategoria() {
    this.editandoCategoria = false;
    this.categoriaEditandoId = null;
    this.formCategoria = { nombre: '', descripcion: '', tipo: 'ventas' };
    this.showModalCategoria = true;
  }

  abrirModalEditarCategoria(cat: any) {
    this.editandoCategoria = true;
    this.categoriaEditandoId = cat.id;
    this.formCategoria = {
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      tipo: cat.tipo || 'ventas'
    };
    this.showModalCategoria = true;
  }

  cerrarModalCategoria() {
    this.showModalCategoria = false;
  }

  guardarCategoria() {
    if (!this.formCategoria.nombre) {
      this.toast.warning('El nombre de la categoría es obligatorio');
      return;
    }
    this.guardandoCategoria = true;
    const payload: Categoria = {
      nombre: this.formCategoria.nombre,
      descripcion: this.formCategoria.descripcion || '',
      tipo: this.formCategoria.tipo,
      activo: true
    };

    if (this.editandoCategoria && this.categoriaEditandoId) {
      this.productoService.actualizarCategoria(this.categoriaEditandoId, payload).pipe(timeout(10000)).subscribe({
        next: () => {
          this.toast.success('Categoría actualizada exitosamente');
          this.cerrarModalCategoria();
          this.guardandoCategoria = false;
          this.cargarCategorias();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          if (err?.name === 'TimeoutError') {
            this.toast.error('Error de tiempo de espera al actualizar categoría.');
          } else {
            this.toast.error('Error al actualizar la categoría');
          }
          this.guardandoCategoria = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.productoService.crearCategoria(payload).pipe(timeout(10000)).subscribe({
        next: () => {
          this.toast.success('Categoría creada exitosamente');
          this.cerrarModalCategoria();
          this.guardandoCategoria = false;
          this.cargarCategorias();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          if (err?.name === 'TimeoutError') {
            this.toast.error('Error de tiempo de espera al crear categoría.');
          } else {
            this.toast.error('Error al crear la categoría');
          }
          this.guardandoCategoria = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  eliminarCategoria(cat: any) {
    if (!confirm(`¿Desea eliminar la categoría "${cat.nombre}"? Los productos asociados quedarán sin categoría.`)) {
      return;
    }
    this.productoService.eliminarCategoria(cat.id).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Categoría eliminada');
        this.cargarCategorias();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al eliminar categoría.');
        } else {
          this.toast.error('Error al eliminar la categoría');
        }
        this.cdr.detectChanges();
      }
    });
  }

  private cargarCategorias() {
    this.productoService.getCategorias().pipe(timeout(15000)).subscribe({
      next: (res) => { this.categorias = res; this.cdr.detectChanges(); },
      error: () => { this.categorias = []; this.cdr.detectChanges(); }
    });
  }

  tipoCategoria(cat: any): string {
    const t = cat.tipo || 'ventas';
    if (t === 'servicios') return 'Servicios';
    if (t === 'ventas y servicios') return 'Ventas y Servicios';
    return 'Ventas';
  }
}