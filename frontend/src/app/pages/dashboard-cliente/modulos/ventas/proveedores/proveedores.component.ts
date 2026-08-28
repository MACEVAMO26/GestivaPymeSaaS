import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProveedorService, Proveedor } from '../../../../../services/proveedor.service';
import { CuentasPagarService, CuentaPorPagar } from '../../../../../services/cuentas-pagar.service';
import { ToastService } from '../../../../../services/toast.service';
import { SolicitudInactivacionComponent } from '../../../../../shared/components/solicitud-inactivacion/solicitud-inactivacion.component';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, SolicitudInactivacionComponent],
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.scss'
})
export class ProveedoresComponent implements OnInit {
  private proveedorService = inject(ProveedorService);
  private cuentasPagarService = inject(CuentasPagarService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  proveedores: Proveedor[] = [];
  proveedoresFiltrados: Proveedor[] = [];
  searchTerm: string = '';
  cargando = false;
  isSaving = false;
  deletingId: number | null = null;

  proveedorActual: Proveedor = this.proveedorVacio();

  showModal: boolean = false;
  isEditMode: boolean = false;

  showModalPago: boolean = false;
  cuentaSeleccionada: any = null;

  showModalEvaluacion: boolean = false;
  evaluacionSeleccionada: any = null;
  nuevaCalificacion: number = 5;
  nuevoComentario: string = '';

  activeTab: string = 'directorio';

  cuentasPorPagar: any[] = [];
  totalDeuda: number = 0;
  contratos: any[] = [];

  ngOnInit() {
    this.cargarProveedores();
    this.cargarCuentasPorPagar();
    this.cargarEvaluaciones();
  }

  cargarProveedores() {
    this.cargando = true;
    this.proveedorService.getProveedores().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.proveedores = res;
        this.proveedoresFiltrados = res;
        this.cargando = false;
        this.cargarEvaluaciones();
        this.cdr.detectChanges();
      },
      error: () => {
        this.proveedores = [];
        this.proveedoresFiltrados = [];
        this.toast.error('Error al cargar proveedores');
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarCuentasPorPagar() {
    this.cuentasPagarService.getCuentas().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.cuentasPorPagar = res;
        this.totalDeuda = res.reduce((acc, c) => acc + (c.saldo_pendiente || 0), 0);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cuentasPorPagar = [];
        this.totalDeuda = 0;
        this.cdr.detectChanges();
      }
    });
  }

  cargarEvaluaciones() {
    this.contratos = this.proveedores
      .filter(p => p.calificacion !== undefined || p.estado_evaluacion)
      .map(p => ({
        id: p.id,
        proveedor: p.razon_social,
        vigencia: '',
        nrc: p.estado_evaluacion || 'Pendiente',
        calificacion: p.calificacion || 0,
        comentarios: p.comentarios_evaluacion || ''
      }));
  }

  nombreProveedorCuenta(cuenta: any): string {
    return cuenta.proveedor?.razon_social || cuenta.proveedor?.nombre || '-';
  }

  filtrarProveedores() {
    const term = this.searchTerm.toLowerCase();
    this.proveedoresFiltrados = this.proveedores.filter(p => 
      p.razon_social?.toLowerCase().includes(term) || 
      p.nit?.toLowerCase().includes(term)
    );
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  exportarExcel() {
    this.toast.success('Generando archivo Excel...');
    const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}` };
    this.http.get('/api/export/proveedores', { headers, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proveedores_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success('Excel de proveedores descargado');
      },
      error: () => this.toast.error('Error al exportar. Intenta nuevamente.')
    });
  }

  proveedorVacio(): Proveedor {
    return {
      razon_social: '',
      nit: '',
      contacto: '',
      telefono: '',
      direccion: '',
      email: '',
      documentos_url: '',
      activo: true,
      calificacion: 0,
      comentarios_evaluacion: '',
      estado_evaluacion: 'Pendiente'
    };
  }

  formatearId(id: number | undefined): string {
    if (!id) return '000';
    return id.toString().padStart(3, '0');
  }

  getBadgeEval(estado: string | undefined): string {
    if (estado === 'Evaluado') return 'badge-aprobada';
    if (estado === 'Pendiente') return 'badge-pendiente';
    return 'badge-rechazada';
  }

  getBadgeCuentas(estado: string): string {
    if (estado === 'Pagada') return 'badge-aprobada';
    if (estado === 'Vencida') return 'badge-rechazada';
    return 'badge-pendiente';
  }

  abrirModal(proveedor?: Proveedor) {
    if (proveedor) {
      this.isEditMode = true;
      this.proveedorActual = { ...proveedor };
    } else {
      this.isEditMode = false;
      this.proveedorActual = this.proveedorVacio();
    }
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
  }

  guardarProveedor() {
    if (!this.proveedorActual.razon_social || !this.proveedorActual.nit) {
      this.toast.warning('Razón social y NIT son obligatorios');
      return;
    }
    
    this.isSaving = true;
    if (this.isEditMode && this.proveedorActual.id) {
      this.proveedorService.actualizarProveedor(this.proveedorActual.id, this.proveedorActual).pipe(timeout(10000)).subscribe({
        next: () => {
          this.toast.success('Proveedor actualizado');
          this.cargarProveedores();
          this.cerrarModal();
          this.isSaving = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          if (err?.name === 'TimeoutError') {
            this.toast.error('Error de tiempo de espera al actualizar proveedor.');
          } else {
            this.toast.error('Error al actualizar proveedor');
          }
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.proveedorService.crearProveedor(this.proveedorActual).pipe(timeout(10000)).subscribe({
        next: () => {
          this.toast.success('Proveedor registrado');
          this.cargarProveedores();
          this.cerrarModal();
          this.isSaving = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          if (err?.name === 'TimeoutError') {
            this.toast.error('Error de tiempo de espera al registrar proveedor.');
          } else {
            this.toast.error('Error al registrar proveedor');
          }
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  eliminarProveedor(id: number | undefined) {
    if (!id) return;
    this.deletingId = id;
    this.proveedorService.eliminarProveedor(id).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Proveedor eliminado');
        this.cargarProveedores();
        this.deletingId = null;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al eliminar proveedor.');
        } else {
          this.toast.error('Error al eliminar proveedor');
        }
        this.deletingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  abrirPago(cuenta: any) {
    this.cuentaSeleccionada = cuenta;
    this.showModalPago = true;
  }

  cerrarPago() {
    this.showModalPago = false;
    this.cuentaSeleccionada = null;
  }

  confirmarPago() {
    if (!this.cuentaSeleccionada?.id) {
      this.toast.error('Cuenta no válida');
      return;
    }
    this.isSaving = true;
    const monto = Number(this.cuentaSeleccionada.saldo_pendiente || 0);
    if (monto <= 0) {
      this.toast.warning('La cuenta ya está saldada');
      this.isSaving = false;
      return;
    }
    this.cuentasPagarService.registrarAbono(this.cuentaSeleccionada.id, monto).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Pago confirmado con éxito');
        this.isSaving = false;
        this.cerrarPago();
        this.cargarCuentasPorPagar();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSaving = false;
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al registrar pago.');
        } else {
          this.toast.error(err.error?.message || 'Error al registrar el pago');
        }
        this.cdr.detectChanges();
      }
    });
  }

  abrirEvaluar(evaluacion: any) {
    this.evaluacionSeleccionada = evaluacion;
    this.nuevaCalificacion = evaluacion.calificacion || 5;
    this.nuevoComentario = evaluacion.comentarios || '';
    this.showModalEvaluacion = true;
  }

  cerrarEvaluar() {
    this.showModalEvaluacion = false;
    this.evaluacionSeleccionada = null;
  }

  guardarEvaluacion() {
    if (!this.evaluacionSeleccionada?.id) {
      this.toast.error('Proveedor no válido');
      return;
    }
    this.isSaving = true;
    const payload = {
      calificacion: Number(this.nuevaCalificacion) || 0,
      comentarios_evaluacion: this.nuevoComentario,
      estado_evaluacion: this.nuevaCalificacion > 0 ? 'Evaluado' : 'Pendiente'
    };
    this.proveedorService.actualizarProveedor(this.evaluacionSeleccionada.id, payload).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Evaluación guardada');
        this.isSaving = false;
        this.cerrarEvaluar();
        this.cargarProveedores();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al guardar evaluación.');
        } else {
          this.toast.error('Error al guardar la evaluación');
        }
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
