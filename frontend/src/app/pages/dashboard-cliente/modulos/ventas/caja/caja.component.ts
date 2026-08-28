import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajaService, Caja, CajaMovimiento } from '../../../../../services/caja.service';
import { ToastService } from '../../../../../services/toast.service';
import { AuthService } from '../../../../../services/auth.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './caja.component.html',
  styleUrl: './caja.component.scss'
})
export class CajaComponent implements OnInit {
  private cajaService = inject(CajaService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  subTabActiva: 'operacion' | 'auditoria' | 'semanal' = 'operacion';

  cajas: Caja[] = [];
  cajaActiva: Caja | null = null;
  movimientos: any[] = [];
  
  cargando = false;
  procesando = false;

  montoApertura = 0; // Apertura por defecto a $0
  montoCierre = 0;
  horaApertura = '08:00 AM';
  horaCierre = '06:00 PM';

  mostrarFormNuevaCaja = false;
  baseNuevaCaja = 0;

  mediosPago: string[] = [
    'Efectivo',
    'Transferencia Bancaria (Cuenta Empresa)',
    'Tarjeta de Crédito / Débito',
    'Crédito / Cuotas'
  ];
  subiendoComprobante = false;

  nuevoMovimiento: any = {
    caja_id: 0,
    tipo: 'ingreso',
    monto: 0,
    concepto: '',
    medio_pago: 'Efectivo',
    comprobante_url: '',
    estado_verificacion: 'Aprobado'
  };

  // Visor Auditoría Modal
  modalAuditoria = false;
  movimientoAuditoria: any = null;

  // Datos mock de auditoría pendiente
  movimientosPendientes: any[] = [
    {
      id: 101,
      fecha_hora: '2026-08-26 09:30 AM',
      tipo: 'ingreso',
      monto: 150000,
      concepto: 'Pago servicio Mantenimiento #SERV-004',
      medio_pago: 'Nequi',
      comprobante_url: 'https://res.cloudinary.com/demo/image/upload/v1631234567/comprobante_sample.jpg',
      estado_verificacion: 'Pendiente',
      cliente: 'Clínica San José'
    },
    {
      id: 102,
      fecha_hora: '2026-08-26 11:15 AM',
      tipo: 'ingreso',
      monto: 320000,
      concepto: 'Pago factura Venta #VEN-012',
      medio_pago: 'Transferencia Bancaria',
      comprobante_url: 'https://res.cloudinary.com/demo/image/upload/v1631234567/transferencia_sample.jpg',
      estado_verificacion: 'Pendiente',
      cliente: 'Techventas SAS'
    }
  ];

  // Resumen Semanal acumulado (Lunes a Domingo)
  resumenSemanal = [
    { dia: 'Lunes', apertura: '08:00 AM', cierre: '06:00 PM', efectivo: 150000, banco: 320000, aprobados: 8, rechazados: 0, total: 470000 },
    { dia: 'Martes', apertura: '08:00 AM', cierre: '06:00 PM', efectivo: 210000, banco: 450000, aprobados: 12, rechazados: 1, total: 660000 },
    { dia: 'Miércoles', apertura: '08:00 AM', cierre: '06:00 PM', efectivo: 180000, banco: 290000, aprobados: 9, rechazados: 0, total: 470000 },
    { dia: 'Jueves', apertura: '08:00 AM', cierre: '06:00 PM', efectivo: 240000, banco: 510000, aprobados: 14, rechazados: 1, total: 750000 },
    { dia: 'Viernes', apertura: '08:00 AM', cierre: '06:30 PM', efectivo: 310000, banco: 680000, aprobados: 18, rechazados: 0, total: 990000 },
    { dia: 'Sábado', apertura: '08:30 AM', cierre: '02:00 PM', efectivo: 120000, banco: 190000, aprobados: 5, rechazados: 0, total: 310000 },
    { dia: 'Domingo', apertura: 'Cerrado', cierre: 'Cerrado', efectivo: 0, banco: 0, aprobados: 0, rechazados: 0, total: 0 }
  ];

  ngOnInit() {
    this.cargarCajas();
  }

  esJefeFinanzasOGerente(): boolean {
    const user = this.authService.getUser();
    if (!user) return false;
    const rol = (user.rol?.nombre || '').toLowerCase();
    const cargo = (user.cargo?.nombre || user.puesto || '').toLowerCase();
    return (
      rol.includes('gerente') ||
      cargo.includes('gerente') ||
      cargo.includes('finanzas') ||
      cargo.includes('jefe de finanzas') ||
      cargo.includes('tesorer')
    );
  }

  switchSubTab(tab: 'operacion' | 'auditoria' | 'semanal') {
    if (tab === 'auditoria' && !this.esJefeFinanzasOGerente()) {
      this.toast.warning('Solo el Jefe de Finanzas y Gerencia tienen acceso a la Auditoría de Comprobantes.');
      return;
    }
    this.subTabActiva = tab;
  }

  cargarCajas() {
    this.cargando = true;
    this.cajaService.getCajas().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.cajas = res;
        if (this.cajas.length > 0) {
          this.cajaActiva = this.cajas[0];
          this.nuevoMovimiento.caja_id = this.cajaActiva.id || 0;
          this.cargarMovimientos(this.cajaActiva.id!);
        }
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

  crearNuevaCaja() {
    if (this.baseNuevaCaja < 0) {
      this.toast.warning('Ingrese una base inicial válida');
      return;
    }
    this.procesando = true;
    this.cajaService.crearCaja(this.baseNuevaCaja).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Caja creada correctamente');
        this.mostrarFormNuevaCaja = false;
        this.baseNuevaCaja = 0;
        this.procesando = false;
        this.cargarCajas();
      },
      error: () => {
        this.toast.error('Error al crear la caja');
        this.procesando = false;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarCaja(caja: Caja) {
    this.cajaActiva = caja;
    this.nuevoMovimiento.caja_id = caja.id || 0;
    this.cargarMovimientos(caja.id!);
  }

  cargarMovimientos(cajaId: number) {
    this.cajaService.getMovimientos(cajaId).pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.movimientos = res;
        this.cdr.detectChanges();
      },
      error: () => {
        this.movimientos = [];
        this.cdr.detectChanges();
      }
    });
  }

  abrirCaja() {
    if (!this.cajaActiva?.id) return;
    this.procesando = true;
    this.cajaService.abrirCaja(this.cajaActiva.id, this.montoApertura).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success(`Caja abierta a las ${this.horaApertura} con base inicial $${this.montoApertura}`);
        if (this.cajaActiva) {
          this.cajaActiva.estado = 'abierta';
          this.cajaActiva.base_inicial = this.montoApertura;
        }
        this.procesando = false;
        this.cargarMovimientos(this.cajaActiva!.id!);
      },
      error: () => {
        this.toast.error('Error al abrir la caja');
        this.procesando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cerrarCaja() {
    if (!this.cajaActiva?.id) return;
    this.procesando = true;
    this.cajaService.cerrarCaja(this.cajaActiva.id, this.montoCierre).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success(`Caja cerrada a las ${this.horaCierre}. Arqueo finalizado.`);
        if (this.cajaActiva) {
          this.cajaActiva.estado = 'cerrada';
          this.cajaActiva.saldo_final = this.montoCierre;
        }
        this.procesando = false;
        this.cargarMovimientos(this.cajaActiva!.id!);
      },
      error: () => {
        this.toast.error('Error al cerrar la caja');
        this.procesando = false;
        this.cdr.detectChanges();
      }
    });
  }

  onArchivoSeleccionado(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.subiendoComprobante = true;
      // Simula subida a Cloudinary
      setTimeout(() => {
        this.nuevoMovimiento.comprobante_url = 'https://res.cloudinary.com/demo/image/upload/v1631234567/comprobante_adjunto.jpg';
        this.subiendoComprobante = false;
        this.toast.success('Comprobante cargado correctamente a Cloudinary');
        this.cdr.detectChanges();
      }, 1000);
    }
  }

  registrarMovimiento() {
    if (!this.nuevoMovimiento.monto || this.nuevoMovimiento.monto <= 0) {
      this.toast.warning('Ingrese un monto válido');
      return;
    }

    if (this.nuevoMovimiento.medio_pago !== 'Efectivo' && !this.nuevoMovimiento.comprobante_url) {
      this.toast.warning('Debe adjuntar el comprobante para pagos digitales/bancarios.');
      return;
    }

    this.procesando = true;
    this.nuevoMovimiento.estado_verificacion = this.nuevoMovimiento.medio_pago === 'Efectivo' ? 'Aprobado' : 'Pendiente';

    this.cajaService.registrarMovimiento(this.nuevoMovimiento).pipe(timeout(10000)).subscribe({
      next: () => {
        if (this.nuevoMovimiento.medio_pago !== 'Efectivo') {
          this.toast.info('Movimiento registrado en estado PENDIENTE por auditoría del Jefe de Finanzas.');
          this.movimientosPendientes.push({
            id: Date.now(),
            fecha_hora: new Date().toLocaleString(),
            tipo: this.nuevoMovimiento.tipo,
            monto: this.nuevoMovimiento.monto,
            concepto: this.nuevoMovimiento.concepto,
            medio_pago: this.nuevoMovimiento.medio_pago,
            comprobante_url: this.nuevoMovimiento.comprobante_url,
            estado_verificacion: 'Pendiente',
            cliente: 'Cliente Registrado'
          });
        } else {
          this.toast.success('Movimiento en efectivo registrado en caja.');
        }

        this.nuevoMovimiento.monto = 0;
        this.nuevoMovimiento.concepto = '';
        this.nuevoMovimiento.comprobante_url = '';
        this.nuevoMovimiento.medio_pago = 'Efectivo';
        this.procesando = false;

        if (this.cajaActiva?.id) this.cargarMovimientos(this.cajaActiva.id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Error al registrar movimiento');
        this.procesando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- AUDITORÍA DE COMPROBANTES (JEFE DE FINANZAS) ---
  verComprobante(mov: any) {
    this.movimientoAuditoria = mov;
    this.modalAuditoria = true;
  }

  cerrarAuditoriaModal() {
    this.modalAuditoria = false;
    this.movimientoAuditoria = null;
  }

  aprobarTransaccion(mov: any) {
    mov.estado_verificacion = 'Aprobado';
    this.toast.success(`Transacción #${mov.id} aprobada sin novedad por Finanzas.`);
    this.movimientosPendientes = this.movimientosPendientes.filter(m => m.id !== mov.id);
    this.cerrarAuditoriaModal();
    this.cdr.detectChanges();
  }

  rechazarTransaccion(mov: any) {
    mov.estado_verificacion = 'Rechazado';
    this.toast.error(`Transacción #${mov.id} rechazada. Se cancela/revierte la venta/servicio asociado.`);
    this.movimientosPendientes = this.movimientosPendientes.filter(m => m.id !== mov.id);
    this.cerrarAuditoriaModal();
    this.cdr.detectChanges();
  }

  // Totales
  get totalIngresosEfectivo(): number {
    return this.movimientos
      .filter(m => m.tipo === 'ingreso' && (!m.medio_pago || m.medio_pago === 'Efectivo'))
      .reduce((acc, m) => acc + Number(m.monto), 0);
  }

  get totalIngresosBanco(): number {
    return this.movimientos
      .filter(m => m.tipo === 'ingreso' && m.medio_pago && (m.medio_pago.includes('Transferencia') || m.medio_pago.includes('Bancaria') || m.medio_pago.includes('Nequi') || m.medio_pago.includes('Daviplata')))
      .reduce((acc, m) => acc + Number(m.monto), 0);
  }

  get totalIngresosTarjeta(): number {
    return this.movimientos
      .filter(m => m.tipo === 'ingreso' && m.medio_pago && m.medio_pago.includes('Tarjeta'))
      .reduce((acc, m) => acc + Number(m.monto), 0);
  }

  get totalIngresosCredito(): number {
    return this.movimientos
      .filter(m => m.tipo === 'ingreso' && m.medio_pago && (m.medio_pago.includes('Crédito') || m.medio_pago.includes('Cuotas')))
      .reduce((acc, m) => acc + Number(m.monto), 0);
  }

  get totalEgresos(): number {
    return this.movimientos
      .filter(m => m.tipo === 'egreso')
      .reduce((acc, m) => acc + Number(m.monto), 0);
  }

  get saldoNetoCaja(): number {
    const base = Number(this.cajaActiva?.base_inicial || 0);
    return base + this.totalIngresosEfectivo - this.totalEgresos;
  }

  get granTotalSemanal(): number {
    return this.resumenSemanal.reduce((acc, r) => acc + r.total, 0);
  }
}
