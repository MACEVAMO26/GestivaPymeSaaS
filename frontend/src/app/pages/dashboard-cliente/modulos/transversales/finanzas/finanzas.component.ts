import { Component, OnInit, inject , ChangeDetectorRef} from '@angular/core';
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
  imports: [CommonModule, FormsModule, SolicitudInactivacionComponent],
  templateUrl: './finanzas.component.html',
  styleUrl: './finanzas.component.scss'
})
export class FinanzasComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private cajaService = inject(CajaService);
  private prefacturacionService = inject(PrefacturacionService);
  private toast = inject(ToastService);

  activeTab: string = 'caja'; // 'caja' | 'prefacturas'

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

  ngOnInit() {
    this.cargarCajas();
    this.cargarPrefacturas();
  }

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
        this.cdr.detectChanges();}
    });
  }

  cargarMovimientos(cajaId: number) {
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

  cargarPrefacturas() {
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

  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'caja') this.cargarCajas();
    if (tab === 'prefacturas') this.cargarPrefacturas();
  }

  abrirCajaModal() {
    this.montoApertura = null;
    this.showModalApertura = true;
  }

  cerrarCajaModal() {
    this.showModalApertura = false;
  }

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

  abrirCierreModal() {
    this.showModalCierre = true;
  }

  cerrarCierreModal() {
    this.showModalCierre = false;
  }

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

  getBadgeClass(estado: string): string {
    if (estado === 'aprobado' || estado === 'Procesada') return 'badge-success';
    if (estado === 'rechazado' || estado === 'Rechazada') return 'badge-danger';
    return 'badge-warning';
  }

  fechaMovimiento(mov: any): string {
    return mov.fecha_hora || mov.created_at || mov.fecha || '';
  }

  nombreClientePref(pref: any): string {
    if (pref.cliente?.razon_social) return pref.cliente.razon_social;
    if (pref.cliente?.nombre) return pref.cliente.nombre;
    if (pref.cliente?.primer_nombre) return `${pref.cliente.primer_nombre} ${pref.cliente.primer_apellido || ''}`;
    return '-';
  }

  consecutivoPref(pref: any): string {
    return pref.consecutivo || `PRE-${String(pref.id).padStart(4, '0')}`;
  }

  fechaPref(pref: any): string {
    return pref.fecha_hora || pref.fecha || '';
  }

  estadoPref(pref: any): string {
    return pref.estado || 'Pendiente';
  }

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