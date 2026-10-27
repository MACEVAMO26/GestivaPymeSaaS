import { VolverDirective } from '../../../../../shared/directives/volver.directive';
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
  imports: [CommonModule, FormsModule, SolicitudInactivacionComponent, VolverDirective],
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

  // --- VARIABLES DE ESTADO ---
  activeTab: string = 'directorio';

  cuentasPorPagar: any[] = [];
  totalDeuda: number = 0;
  contratos: any[] = [];

  pageSize = 8;
  pageDirectorio = 1;
  pageCuentas = 1;
  pageEvaluaciones = 1;

  get paginatedDirectorio(): Proveedor[] {
    const start = (this.pageDirectorio - 1) * this.pageSize;
    return this.proveedoresFiltrados.slice(start, start + this.pageSize);
  }

  get totalPagesDirectorio(): number {
    return Math.ceil(this.proveedoresFiltrados.length / this.pageSize) || 1;
  }

  get paginatedCuentas(): any[] {
    const start = (this.pageCuentas - 1) * this.pageSize;
    return this.cuentasPorPagar.slice(start, start + this.pageSize);
  }

  get totalPagesCuentas(): number {
    return Math.ceil(this.cuentasPorPagar.length / this.pageSize) || 1;
  }

  get paginatedEvaluaciones(): any[] {
    const start = (this.pageEvaluaciones - 1) * this.pageSize;
    return this.contratos.slice(start, start + this.pageSize);
  }

  get totalPagesEvaluaciones(): number {
    return Math.ceil(this.contratos.length / this.pageSize) || 1;
  }

  // Bloque de ciclo de vida OnInit para cargar el directorio de proveedores
  ngOnInit() {
    this.// Bloque para consultar el catálogo de proveedores desde el backend
  cargarProveedores();
    this.// Bloque para consultar las cuentas por pagar a proveedores
  cargarCuentasPorPagar();
    this.// Bloque para cargar el historial de evaluaciones de proveedores
  cargarEvaluaciones();
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
    this.contratos = this.proveedores.map(p => ({
      id: p.id,
      proveedor: p.razon_social,
      vigencia: p.activo ? '2025 - 2026 (Vigente)' : 'Vencido',
      nrc: p.estado_evaluacion || (p.calificacion && p.calificacion > 0 ? 'Aprobado' : 'Pendiente'),
      calificacion: p.calificacion || 0,
      comentarios: p.comentarios_evaluacion || (p.calificacion && p.calificacion > 0 ? 'Cumplimiento satisfactorio de SLAs' : 'Evaluación periódica pendiente')
    }));
  }

  // Bloque utilitario para resolver el nombre del proveedor en la cuenta
  nombreProveedorCuenta(cuenta: any): string {
    return cuenta.proveedor?.razon_social || cuenta.proveedor?.nombre || '-';
  }

  // Bloque para filtrar el directorio de proveedores por búsqueda o categoría
  filtrarProveedores() {
    this.pageDirectorio = 1;
    const term = this.searchTerm.toLowerCase();
    this.proveedoresFiltrados = this.proveedores.filter(p => 
      p.razon_social?.toLowerCase().includes(term) || 
      p.nit?.toLowerCase().includes(term)
    );
  }

  // Bloque para alternar entre pestañas del módulo de proveedores
  switchTab(tab: string) {
    this.activeTab = tab;
  }

  // Bloque para exportar el directorio de proveedores a formato Excel
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

  // Bloque utilitario para crear un objeto proveedor con estructura vacía
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

  // Bloque utilitario para formatear el identificador visual del proveedor
  formatearId(id: number | undefined): string {
    if (!id) return '000';
    return id.toString().padStart(3, '0');
  }

  // Bloque para asignar la clase de badge según el estado de evaluación
  getBadgeEval(estado: string | undefined): string {
    if (estado === 'Aprobado' || estado === 'Excelente' || estado === 'Evaluado') return 'badge-aprobada';
    if (estado === 'Pendiente' || estado === 'En revisión') return 'badge-pendiente';
    return 'badge-rechazada';
  }

  // Bloque para asignar la clase cromática del badge de cuentas por pagar
  getBadgeCuentas(estado: string): string {
    if (estado === 'Pagada') return 'badge-aprobada';
    if (estado === 'Vencida') return 'badge-rechazada';
    return 'badge-pendiente';
  }

  // Bloque para abrir el modal de creación o edición de proveedor
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

  // Bloque para cerrar el modal de proveedor
  cerrarModal() {
    this.showModal = false;
  }

  // Bloque para validar y persistir los datos del proveedor
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

  // Bloque para solicitar la inactivación de un proveedor
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

  // Bloque para abrir el modal de registro de abono o pago a proveedor
  abrirPago(cuenta: any) {
    this.cuentaSeleccionada = cuenta;
    this.showModalPago = true;
  }

  // Bloque para cerrar el modal de abono a cuenta por pagar
  cerrarPago() {
    this.showModalPago = false;
    this.cuentaSeleccionada = null;
  }

  // Bloque para registrar el abono monetario y actualizar el saldo de la deuda
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

  // Bloque para abrir el modal de calificación y evaluación de desempeño
  abrirEvaluar(evaluacion: any) {
    this.evaluacionSeleccionada = evaluacion;
    this.nuevaCalificacion = evaluacion.calificacion || 5;
    this.nuevoComentario = evaluacion.comentarios || '';
    this.showModalEvaluacion = true;
  }

  // Bloque para cerrar el diálogo de evaluación
  cerrarEvaluar() {
    this.showModalEvaluacion = false;
    this.evaluacionSeleccionada = null;
  }

  // Bloque para validar y guardar la calificación otorgada al proveedor
  guardarEvaluacion() {
    if (!this.evaluacionSeleccionada?.id) {
      this.toast.error('Proveedor no válido');
      return;
    }
    this.isSaving = true;
    const calif = Number(this.nuevaCalificacion) || 0;
    const estado = calif >= 4 ? 'Aprobado' : (calif >= 2 ? 'En revisión' : 'Condicionado');
    const payload = {
      calificacion: calif,
      comentarios_evaluacion: this.nuevoComentario || 'Evaluación de desempeño y cumplimiento de acuerdos',
      estado_evaluacion: estado
    };
    this.proveedorService.actualizarProveedor(this.evaluacionSeleccionada.id, payload).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Evaluación y contrato guardados exitosamente');
        this.isSaving = false;
        this.cerrarEvaluar();
        this.cargarProveedores();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSaving = false;
        if (err?.name === 'TimeoutError') {
          this.toast.error('Error de tiempo de espera al guardar evaluación.');
        } else {
          this.toast.error(err.error?.message || 'Error al guardar la evaluación');
        }
        this.cdr.detectChanges();
      }
    });
  }
}
