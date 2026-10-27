import { VolverDirective } from '../../../../../shared/directives/volver.directive';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajaService, Caja, CajaMovimiento } from '../../../../../services/caja.service';
import { PrefacturacionService, CotizacionPedido } from '../../../../../services/prefacturacion.service';
import { ToastService } from '../../../../../services/toast.service';
import { SolicitudInactivacionComponent } from '../../../../../shared/components/solicitud-inactivacion/solicitud-inactivacion.component';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-finanzas',
  standalone: true,
  imports: [CommonModule, FormsModule, SolicitudInactivacionComponent, VolverDirective],
  templateUrl: './finanzas.component.html',
  styleUrl: './finanzas.component.scss'
})
export class FinanzasComponent implements OnInit {
  // --- SERVICIOS INYECTADOS ---
  private cdr = inject(ChangeDetectorRef);
  private cajaService = inject(CajaService);
  private prefacturacionService = inject(PrefacturacionService);
  private toast = inject(ToastService);

  // --- VARIABLES DE ESTADO ---
  activeTab: string = 'caja';
  cajaActiva: Caja | null = null;
  cajaAbierta: boolean = false;
  showModalApertura: boolean = false;
  montoApertura: number | null = null;
  guardando: boolean = false;
  showModalCierre: boolean = false;

  totalIngresos: number = 0;
  totalEgresos: number = 0;
  saldoActual: number = 0;

  tipoMovimiento: string = 'ingreso';
  montoMovimiento: number | null = null;
  conceptoMovimiento: string = '';

  movimientos: CajaMovimiento[] = [];
  prefacturas: CotizacionPedido[] = [];

  pageSize = 8;
  pageMovimientos = 1;
  pagePrefacturas = 1;

  // --- GETTERS Y PAGINACION ---
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

  // Bloque de ciclo de vida OnInit para cargar cajas y prefacturas
  ngOnInit() {
    this.cargarCajas();
    this.cargarPrefacturas();
  }

  // Bloque para consultar el estado actual de las cajas registradoras
  cargarCajas() {
    this.cajaService.getCajas().pipe(timeout(15000)).subscribe({
      next: (res) => {
        const abierta = res.find(c => c.estado === 'abierta');
        if (abierta) {
          this.cajaActiva = abierta;
          this.cajaAbierta = true;
          this.cargarMovimientos(abierta.id!);
        } else {
          this.cajaActiva = null;
          this.cajaAbierta = false;
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para cargar el historial de movimientos de la caja activa
  cargarMovimientos(cajaId: number) {
    this.pageMovimientos = 1;
    this.cajaService.getMovimientos(cajaId).pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.movimientos = res;
        this.totalIngresos = res.filter(m => m.tipo === 'ingreso' || m.tipo === 'apertura').reduce((a, m) => a + m.monto, 0);
        this.totalEgresos = res.filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0);
        this.saldoActual = (this.cajaActiva?.base_inicial || 0) + this.totalIngresos - this.totalEgresos;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.movimientos = [];
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para cargar las cotizaciones y prefacturas pendientes
  cargarPrefacturas() {
    this.pagePrefacturas = 1;
    this.prefacturacionService.getCotizaciones().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.prefacturas = res;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.prefacturas = [];
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para alternar entre pestañas de finanzas
  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'caja') this.cargarCajas();
    if (tab === 'prefacturas') this.cargarPrefacturas();
  }

  // Bloque para abrir el modal de apertura de caja
  abrirCajaModal() {
    this.montoApertura = null;
    this.showModalApertura = true;
  }

  // Bloque para cerrar el modal de apertura de caja
  cerrarCajaModal() {
    this.showModalApertura = false;
  }

  // Bloque para validar y registrar la apertura de caja
  confirmarApertura() {
    if (this.montoApertura === null || this.montoApertura < 0) {
      this.toast.warning('Ingresa un monto base válido');
      return;
    }

    this.guardando = true;
    this.cajaService.crearCaja(this.montoApertura || 0).pipe(timeout(10000)).subscribe({
      next: (caja) => {
        this.cajaActiva = caja;
        this.cajaAbierta = true;
        this.saldoActual = caja.base_inicial;
        this.guardando = false;
        this.showModalApertura = false;
        this.toast.success('Caja abierta con éxito');
        this.cargarMovimientos(caja.id!);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.guardando = false;
        this.toast.error('Error al abrir la caja');
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para validar y registrar un movimiento manual de ingreso o egreso
  registrarMovimiento() {
    if (!this.montoMovimiento || this.montoMovimiento <= 0 || !this.conceptoMovimiento.trim()) {
      this.toast.warning('Ingresa monto y concepto válidos');
      return;
    }
    if (!this.cajaActiva?.id) {
      this.toast.error('No hay una caja abierta');
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
        this.montoMovimiento = null;
        this.conceptoMovimiento = '';
        this.toast.success('Movimiento registrado');
        this.cargarMovimientos(this.cajaActiva!.id!);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.guardando = false;
        this.toast.error('Error al registrar movimiento');
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para abrir el modal de arqueo y cierre de caja
  abrirCierreModal() {
    this.showModalCierre = true;
  }

  // Bloque para cerrar el diálogo de arqueo y cierre
  cerrarCierreModal() {
    this.showModalCierre = false;
  }

  // Bloque para procesar el cierre y balance de la caja activa
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
        this.showModalCierre = false;
        this.toast.success('Cierre de caja exitoso');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.guardando = false;
        this.toast.error('Error al cerrar la caja');
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para mapear el estado a una clase visual de badge
  getBadgeClass(estado: string): string {
    if (estado === 'aprobado' || estado === 'Procesada') return 'badge-success';
    if (estado === 'rechazado' || estado === 'Rechazada') return 'badge-danger';
    return 'badge-warning';
  }

  // Bloque utilitario para formatear la fecha del movimiento
  fechaMovimiento(mov: any): string {
    return mov.fecha_hora || mov.created_at || mov.fecha || '';
  }

  // Bloque utilitario para resolver el nombre del cliente en prefacturación
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

  // Bloque utilitario para obtener la fecha de la prefactura
  fechaPref(pref: any): string {
    return pref.fecha_hora || pref.fecha || '';
  }

  // Bloque utilitario para obtener el estado de la prefactura
  estadoPref(pref: any): string {
    return pref.estado || 'Pendiente';
  }

  // Bloque para convertir y emitir la factura final desde una prefactura
  generarDocumento(id: number) {
    if (!this.cajaActiva?.id) {
      this.toast.error('Debes abrir caja primero');
      return;
    }
    this.prefacturacionService.cambiarEstado(id, 'aprobado').pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Factura generada');
        this.cargarPrefacturas();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.toast.error('Error al procesar la factura');
        this.cdr.detectChanges();
      }
    });
  }
}
