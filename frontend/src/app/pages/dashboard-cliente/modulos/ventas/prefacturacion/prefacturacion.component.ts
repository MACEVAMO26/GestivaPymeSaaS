import { VolverDirective } from '../../../../../shared/directives/volver.directive';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajaService, Caja, CajaMovimiento } from '../../../../../services/caja.service';
import { PrefacturacionService, CotizacionPedido } from '../../../../../services/prefacturacion.service';
import { ToastService } from '../../../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-prefacturacion',
  standalone: true,
  imports: [CommonModule, FormsModule, VolverDirective],
  templateUrl: './prefacturacion.component.html',
  styleUrl: './prefacturacion.component.scss'
})
export class PrefacturacionComponent implements OnInit {
  private cajaService = inject(CajaService);
  private prefacturacionService = inject(PrefacturacionService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  // --- VARIABLES DE ESTADO ---
  activeTab: string = 'caja';

  cajas: Caja[] = [];
  cajaActiva: Caja | null = null;
  cajaAbierta: boolean = false;
  showModalApertura: boolean = false;
  montoApertura: number = 0;

  totalIngresos: number = 0;
  totalEgresos: number = 0;
  saldoActual: number = 0;

  showModalCierre: boolean = false;

  tipoMovimiento: string = 'ingreso';
  montoMovimiento: number = 0;
  conceptoMovimiento: string = '';
  movimientos: CajaMovimiento[] = [];
  prefacturas: CotizacionPedido[] = [];

  pageSize = 8;
  pageMovimientos = 1;
  pagePrefacturas = 1;

  get paginatedMovimientos(): CajaMovimiento[] {
    const start = (this.pageMovimientos - 1) * this.pageSize;
    return this.movimientos.slice(start, start + this.pageSize);
  }
  get totalPagesMovimientos(): number {
    return Math.ceil(this.movimientos.length / this.pageSize) || 1;
  }

  get paginatedPrefacturas(): CotizacionPedido[] {
    const start = (this.pagePrefacturas - 1) * this.pageSize;
    return this.prefacturas.slice(start, start + this.pageSize);
  }
  get totalPagesPrefacturas(): number {
    return Math.ceil(this.prefacturas.length / this.pageSize) || 1;
  }

  guardando: boolean = false;
  cargando = false;

  // Bloque de ciclo de vida OnInit para cargar cajas y prefacturas
  ngOnInit() {
    this.// Bloque para consultar el estado actual de las cajas
  cargarCajas();
    this.// Bloque para consultar las cotizaciones y prefacturas pendientes
  cargarPrefacturas();
  }

  cargarCajas() {
    this.cajaService.getCajas().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.cajas = res;
        const abierta = res.find(c => c.estado === 'abierta');
        if (abierta) {
          this.cajaActiva = abierta;
          this.cajaAbierta = true;
          this.totalIngresos = abierta.total_ingresos || 0;
          this.totalEgresos = abierta.total_egresos || 0;
          this.saldoActual = (abierta.base_inicial || 0) + this.totalIngresos - this.totalEgresos;
          this.cargarMovimientos(abierta.id!);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cajas = [];
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para consultar los movimientos registrados en la caja activa
  cargarMovimientos(cajaId: number) {
    this.cajaService.getMovimientos(cajaId).pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.movimientos = res;
        this.totalIngresos = res.filter(m => m.tipo === 'ingreso' || m.tipo === 'apertura').reduce((a, m) => a + m.monto, 0);
        this.totalEgresos = res.filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0);
        this.saldoActual = (this.cajaActiva?.base_inicial || 0) + this.totalIngresos - this.totalEgresos;
        this.cdr.detectChanges();
      },
      error: () => {
        this.movimientos = [];
        this.cdr.detectChanges();
      }
    });
  }

  cargarPrefacturas() {
    this.cargando = true;
    this.prefacturacionService.getCotizaciones().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.prefacturas = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.prefacturas = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para alternar entre pestañas de prefacturación y caja
  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'caja') this.cargarCajas();
    if (tab === 'prefacturas') this.cargarPrefacturas();
  }

  // Bloque para abrir el modal de apertura de caja
  abrirCajaModal() {
    this.montoApertura = 0;
    this.showModalApertura = true;
  }

  // Bloque para cerrar el modal de apertura de caja
  cerrarCajaModal() {
    this.showModalApertura = false;
  }

  // Bloque para validar y registrar la apertura de caja en el backend
  confirmarApertura() {
    this.guardando = true;
    this.cajaService.crearCaja(this.montoApertura || 0).pipe(timeout(10000)).subscribe({
      next: (caja) => {
        this.cajaActiva = caja;
        this.cajaAbierta = true;
        this.saldoActual = caja.base_inicial;
        this.guardando = false;
        this.cerrarCajaModal();
        this.toast.success('Caja abierta correctamente');
        this.cargarMovimientos(caja.id!);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al abrir la caja.');
        } else {
          this.toast.error('Error al abrir la caja');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para abrir el diálogo de arqueo y cierre de caja
  abrirCierreModal() {
    this.showModalCierre = true;
  }

  // Bloque para cerrar el diálogo de cierre
  cerrarCierreModal() {
    this.showModalCierre = false;
  }

  // Bloque para procesar el balance y cerrar la caja activa
  confirmarCierre() {
    if (!this.cajaActiva?.id) return;
    this.guardando = true;
    this.cajaService.cerrarCaja(this.cajaActiva.id, this.saldoActual).pipe(timeout(10000)).subscribe({
      next: () => {
        this.cajaAbierta = false;
        this.cajaActiva = null;
        this.totalIngresos = 0;
        this.totalEgresos = 0;
        this.saldoActual = 0;
        this.movimientos = [];
        this.guardando = false;
        this.cerrarCierreModal();
        this.toast.success('Caja cerrada correctamente');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al cerrar la caja.');
        } else {
          this.toast.error('Error al cerrar la caja');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para registrar un movimiento manual de caja
  registrarMovimiento() {
    if (!this.conceptoMovimiento || this.montoMovimiento <= 0) {
      this.toast.warning('Complete el monto y concepto');
      return;
    }
    if (!this.cajaActiva?.id) {
      this.toast.error('No hay caja abierta');
      return;
    }

    this.guardando = true;
    const movimiento: CajaMovimiento = {
      caja_id: this.cajaActiva.id,
      tipo: this.tipoMovimiento as any,
      monto: this.montoMovimiento,
      concepto: this.conceptoMovimiento
    };

    this.cajaService.registrarMovimiento(movimiento).pipe(timeout(10000)).subscribe({
      next: () => {
        this.guardando = false;
        this.montoMovimiento = 0;
        this.conceptoMovimiento = '';
        this.toast.success('Movimiento registrado');
        this.cargarMovimientos(this.cajaActiva!.id!);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al registrar movimiento.');
        } else {
          this.toast.error('Error al registrar movimiento');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para determinar la clase cromática del badge según el estado
  getBadgeClass(estado: string): string {
    if (estado === 'aprobado' || estado === 'Procesada') return 'badge-aprobada';
    if (estado === 'rechazado' || estado === 'Rechazada') return 'badge-rechazada';
    return 'badge-pendiente';
  }

  // Bloque utilitario para formatear la fecha del movimiento
  fechaMovimiento(mov: any): string {
    return mov.fecha_hora || mov.created_at || mov.fecha || '';
  }

  // Bloque utilitario para resolver el nombre del cliente en la prefactura
  nombreClientePref(pref: any): string {
    if (pref.cliente?.razon_social) return pref.cliente.razon_social;
    if (pref.cliente?.nombre) return pref.cliente.nombre;
    if (pref.cliente?.primer_nombre) return `${pref.cliente.primer_nombre} ${pref.cliente.primer_apellido || ''}`;
    return '-';
  }

  // Bloque utilitario para formatear el consecutivo de la prefactura
  consecutivoPref(pref: any): string {
    return pref.consecutivo || `PRE-${String(pref.id).padStart(4, '0')}`;
  }

  // Bloque utilitario para obtener la fecha de emisión
  fechaPref(pref: any): string {
    return pref.fecha_hora || pref.fecha || '';
  }

  // Bloque utilitario para obtener el estado de la prefactura
  estadoPref(pref: any): string {
    return pref.estado || 'Pendiente';
  }

  // Bloque para liquidar y emitir la factura final desde la prefactura
  generarDocumento(id?: number) {
    if (!id) return;
    this.prefacturacionService.cambiarEstado(id, 'aprobado').pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Factura generada');
        this.cargarPrefacturas();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al procesar factura.');
        } else {
          this.toast.error('Error al procesar la factura');
        }
        this.cdr.detectChanges();
      }
    });
  }
}