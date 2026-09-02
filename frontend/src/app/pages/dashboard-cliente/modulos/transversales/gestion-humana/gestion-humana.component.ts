import { Component, OnInit, inject , ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EmpleadoService } from '../../../../../services/empleado.service';
import { VacacionService, Vacacion } from '../../../../../services/vacacion.service';
import { ToastService } from '../../../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-gestion-humana',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-humana.component.html',
  styleUrl: './gestion-humana.component.scss'
})
export class GestionHumanaComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private empleadoService = inject(EmpleadoService);
  private vacacionService = inject(VacacionService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);

  currentTab: string = 'pendientes';

  // Data arrays
  areas: any[] = [];
  cargos: any[] = [];
  roles: any[] = [];
  vacacionesPendientes: any[] = [];
  empleadosActivos: any[] = [];
  empleadosInactivos: any[] = [];
  empleadosAusentes: any[] = [];

  // UI States
  isSubmitting: boolean = false;
  isUploading: boolean = false;
  isConfigSubmitting: boolean = false;

  // Modals
  isAreaModalOpen: boolean = false;
  areaForm: any = {};

  isCargoModalOpen: boolean = false;
  cargoForm: any = {};

  isBajaModalOpen: boolean = false;
  empleadoABaja: any = null;
  showConfirmDialog: boolean = true;
  motivoBaja: string = '';

  isVacacionesModalOpen: boolean = false;
  vacacionSeleccionada: any = null;
  justificacionVacacion: string = '';

  // Detalle empleado
  empleadoExpandido: any = null;
  nombreDocumento: string = '';
  categoriaDocumento: string = 'Otros';
  archivoSeleccionado: any = null;
  documentosEmpleado: any[] = [];
  categoriasDocumento: string[] = ['Hoja de Vida', 'Contrato', 'Cédula', 'Seguridad Social', 'Estudios', 'Certificaciones', 'Otros'];

  // Novedades y Ausencias
  isNovedadModalOpen: boolean = false;
  novedadForm: any = {
    empleado_id: '',
    tipo_novedad: 'incapacitado',
    motivo: '',
    fecha_inicio: '',
    fecha_fin: '',
    soporte: ''
  };

  // Configuración
  configuracionRRHH: any = { arl: '', caja_compensacion: '' };

  ngOnInit(): void {
    this.cargarEmpleados();
    this.cargarVacaciones();
    this.cargarConfiguracion();
  }

  cargarEmpleados() {
    this.empleadoService.getEmpleados().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.empleadosActivos = res.filter((e: any) => e.estado === 'activo');
        this.empleadosInactivos = res.filter((e: any) => e.estado === 'inactivo');
        this.empleadosAusentes = res.filter((e: any) => e.estado && e.estado !== 'activo' && e.estado !== 'inactivo');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.empleadosActivos = [];
        this.empleadosInactivos = [];
        this.empleadosAusentes = [];
        this.cdr.detectChanges();
      }
    });
  }

  cargarVacaciones() {
    this.vacacionService.getVacaciones().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.vacacionesPendientes = res.filter(v => v.estado === 'pendiente');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } this.vacacionesPendientes = [];
        this.cdr.detectChanges(); }
    });
  }

  cargarAreas() {
    this.empleadoService.getAreas().pipe(timeout(15000)).subscribe({
      next: (res) => { this.areas = res;
        this.cdr.detectChanges(); },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } this.areas = [];
        this.cdr.detectChanges(); }
    });
  }

  cargarCargos() {
    this.empleadoService.getCargos().pipe(timeout(15000)).subscribe({
      next: (res) => { this.cargos = res;
        this.cdr.detectChanges(); },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } this.cargos = [];
        this.cdr.detectChanges(); }
    });
  }

  

  cargarConfiguracion() {
    const user = JSON.parse(sessionStorage.getItem('current_user') || '{}');
    const empresaId = user?.empresa_id;
    if (!empresaId) return;
    this.empleadoService.getConfiguracion(empresaId).pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.configuracionRRHH = {
          arl: res.arl || '',
          caja_compensacion: res.caja_compensacion || ''
        };
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.cdr.detectChanges();}
    });
  }

  setTab(tab: string) {
    this.currentTab = tab;
  }

  
  
  // --- Header Actions ---
  exportarExcel() {
    this.toast.success('Generando archivo Excel...');
    const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}` };
    this.http.get('/api/export/empleados', { headers, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `empleados_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success('Excel de empleados descargado');
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('Error al exportar. Intenta nuevamente.')
    });
  }
  abrirModuloTiempo() {
    this.setTab('ausentes');
    this.toast.info('Navegando al módulo de control de tiempos y ausencias');
  }

  // --- Empleados Activos ---
  verDetalles(emp: any) {
    if (this.empleadoExpandido?.id === emp.id) {
      this.empleadoExpandido = null;
    } else {
      this.empleadoExpandido = emp;
      this.cargarDocumentos(emp.id);
    }
  }

  cargarDocumentos(empleadoId: number) {
    this.empleadoService.getDocumentos(empleadoId).pipe(timeout(15000)).subscribe({
      next: (res) => { this.documentosEmpleado = res;
        this.cdr.detectChanges(); },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } this.documentosEmpleado = [];
        this.cdr.detectChanges(); }
    });
  }

  onFileSelected(event: any) {
    this.archivoSeleccionado = event.target.files[0];
  }
  subirDocumento() {
    if (!this.archivoSeleccionado || !this.empleadoExpandido?.id) {
      this.toast.warning('Seleccione un archivo');
      return;
    }
    this.isUploading = true;
    const formData = new FormData();
    formData.append('archivo', this.archivoSeleccionado);
    formData.append('nombre', this.nombreDocumento || this.archivoSeleccionado.name || 'Documento');
    formData.append('categoria', this.categoriaDocumento || 'Otros');
    this.empleadoService.uploadDocumento(this.empleadoExpandido.id, formData).pipe(timeout(15000)).subscribe({
      next: () => {
        this.isUploading = false;
        this.archivoSeleccionado = null;
        this.nombreDocumento = '';
        this.categoriaDocumento = 'Otros';
        this.toast.success('Documento subido');
        this.cargarDocumentos(this.empleadoExpandido!.id);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.isUploading = false;
        this.toast.error('Error al subir el documento');
        this.cdr.detectChanges();
      }
    });
  }

  // --- EXPEDIENTE DIGITAL POR CATEGORÍAS ---
  get categoriasConDocumentos(): { categoria: string, docs: any[] }[] {
    const grupos: { [cat: string]: any[] } = {};
    this.documentosEmpleado.forEach((d) => {
      const cat = d.categoria || 'Otros';
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(d);
    });
    const orden = this.categoriasDocumento;
    return Object.keys(grupos)
      .sort((a, b) => {
        const ia = orden.indexOf(a);
        const ib = orden.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map((cat) => ({ categoria: cat, docs: grupos[cat] }));
  }

  abrirDocumento(doc: any) {
    if (doc.cloudinary_url) {
      window.open(doc.cloudinary_url, '_blank');
    }
  }
  eliminarDocumento(id: number) {
    this.empleadoService.deleteDocumento(id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.toast.success('Documento eliminado');
        if (this.empleadoExpandido?.id) this.cargarDocumentos(this.empleadoExpandido.id);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.toast.error('Error al eliminar el documento');
        this.cdr.detectChanges();
      }
    });
  }

  // --- Baja ---
  abrirModalBaja(emp: any) {
    this.empleadoABaja = emp;
    this.motivoBaja = '';
    this.showConfirmDialog = true;
    this.isBajaModalOpen = true;
  }
  cerrarModalBaja() {
    this.isBajaModalOpen = false;
  }
  submitBaja() {
    if (!this.motivoBaja.trim()) {
      this.toast.warning('Describa el motivo de la baja');
      return;
    }
    if (!this.empleadoABaja?.id) return;
    this.isSubmitting = true;
    this.empleadoService.solicitarBaja(this.empleadoABaja.id, this.motivoBaja).pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.cerrarModalBaja();
        this.toast.success(res.message || 'Solicitud de baja enviada');
        this.cargarEmpleados();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.isSubmitting = false;
        this.toast.error(err.error?.error || 'Error al solicitar la baja');
        this.cdr.detectChanges();
      }
    });
  }

  // --- Vacaciones ---
  abrirModalVacaciones(vac: any) {
    this.vacacionSeleccionada = vac;
    this.justificacionVacacion = '';
    this.isVacacionesModalOpen = true;
  }
  cerrarModalVacaciones() {
    this.isVacacionesModalOpen = false;
  }
  responderVacacion(estado: string) {
    if (!this.vacacionSeleccionada?.id) return;
    this.isSubmitting = true;
    this.vacacionService.responder(this.vacacionSeleccionada.id, estado, this.justificacionVacacion).pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.cerrarModalVacaciones();
        this.toast.success(res.message || 'Solicitud actualizada');
        this.cargarVacaciones();
        this.cargarEmpleados();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.isSubmitting = false;
        this.toast.error('Error al responder la solicitud');
        this.cdr.detectChanges();
      }
    });
  }

  // --- Configuracion ---
  guardarConfiguracionRRHH() {
    const user = JSON.parse(sessionStorage.getItem('current_user') || '{}');
    const empresaId = user?.empresa_id;
    if (!empresaId) {
      this.toast.error('No se pudo identificar la empresa');
      return;
    }
    this.isConfigSubmitting = true;
    this.empleadoService.updateConfiguracion(empresaId, {
      arl: this.configuracionRRHH.arl,
      caja_compensacion: this.configuracionRRHH.caja_compensacion
    }).pipe(timeout(15000)).subscribe({
      next: () => {
        this.isConfigSubmitting = false;
        this.toast.success('Configuración guardada');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.isConfigSubmitting = false;
        this.toast.error('Error al guardar la configuración');
        this.cdr.detectChanges();
      }
    });
  }

  // --- CONTRATOS Y ALERTAS ---
  get todosEmpleados(): any[] {
    return [...this.empleadosActivos, ...this.empleadosInactivos];
  }

  get alertasContratos(): number {
    return this.todosEmpleados.filter(e => ['por_vencer', 'vencido'].includes(this.estadoContrato(e))).length;
  }

  estadoContrato(emp: any): string {
    if (!emp) return 'sin_fin';
    const tipo = (emp.tipo_contrato || '').toLowerCase();
    if (tipo.includes('indefinido')) return 'indefinido';
    if (!emp.fecha_fin_contrato) return 'sin_fin';
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const fin = new Date(emp.fecha_fin_contrato + 'T00:00:00');
    const diffDias = Math.ceil((fin.getTime() - hoy.getTime()) / 86400000);
    if (diffDias < 0) return 'vencido';
    if (diffDias <= 30) return 'por_vencer';
    return 'vigente';
  }

  diasParaVencimiento(emp: any): number {
    if (!emp?.fecha_fin_contrato) return 0;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const fin = new Date(emp.fecha_fin_contrato + 'T00:00:00');
    return Math.ceil((fin.getTime() - hoy.getTime()) / 86400000);
  }

  etiquetaContrato(emp: any): string {
    const st = this.estadoContrato(emp);
    const mapa: any = {
      indefinido: 'Indefinido',
      sin_fin: 'Sin fecha fin',
      vigente: 'Vigente',
      por_vencer: `Vence en ${this.diasParaVencimiento(emp)} día(s)`,
      vencido: 'Vencido'
    };
    return mapa[st];
  }

  claseContrato(emp: any): string {
    const mapa: any = {
      indefinido: 'badge-indefinido',
      sin_fin: 'badge-sinfin',
      vigente: 'badge-vigente',
      por_vencer: 'badge-porvencer',
      vencido: 'badge-vencido'
    };
    return mapa[this.estadoContrato(emp)] || '';
  }

  nombreCompletoUsuario(u: any): string {
    if (!u) return '—';
    return [u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido].filter(Boolean).join(' ');
  }

  // --- MODAL EDITAR CONTRATO ---
  isContratoModalOpen: boolean = false;
  contratoForm: any = {};
  empleadoContrato: any = null;

  abrirModalContrato(emp: any) {
    this.empleadoContrato = emp;
    this.contratoForm = {
      tipo_contrato: emp.tipo_contrato || '',
      fecha_contratacion: emp.fecha_contratacion || '',
      fecha_fin_contrato: emp.fecha_fin_contrato || '',
      salario: emp.salario ?? null
    };
    this.isContratoModalOpen = true;
  }
  cerrarModalContrato() {
    this.isContratoModalOpen = false;
  }
  guardarContrato() {
    if (!this.contratoForm.tipo_contrato || !this.contratoForm.fecha_contratacion) {
      this.toast.warning('El tipo de contrato y la fecha de contratación son obligatorios');
      return;
    }
    if (!this.empleadoContrato?.id) return;
    this.isSubmitting = true;
    this.empleadoService.updateContrato(this.empleadoContrato.id, {
      tipo_contrato: this.contratoForm.tipo_contrato,
      fecha_contratacion: this.contratoForm.fecha_contratacion,
      fecha_fin_contrato: this.contratoForm.fecha_fin_contrato || null,
      salario: this.contratoForm.salario
    }).pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.cerrarModalContrato();
        this.toast.success(res.message || 'Contrato actualizado');
        this.cargarEmpleados();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.isSubmitting = false;
        this.toast.error(err.error?.error || 'Error al actualizar el contrato');
        this.cdr.detectChanges();
      }
    });
  }

  // --- CERTIFICADO LABORAL ---
  descargarCertificado(emp: any) {
    if (!emp?.id) return;
    this.empleadoService.descargarCertificado(emp.id).pipe(timeout(20000)).subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado_laboral_${emp.codigo_empleado || emp.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } else {
          this.toast.error('No se pudo generar el certificado');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // --- NOVEDADES Y GESTIÓN DE AUSENCIAS ---
  abrirModalNovedad(emp?: any) {
    this.novedadForm = {
      empleado_id: emp ? emp.id : (this.empleadosActivos[0]?.id || ''),
      tipo_novedad: 'incapacitado',
      motivo: '',
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fecha_fin: '',
      soporte: ''
    };
    this.isNovedadModalOpen = true;
  }

  cerrarModalNovedad() {
    this.isNovedadModalOpen = false;
  }

  guardarNovedad() {
    if (!this.novedadForm.empleado_id || !this.novedadForm.tipo_novedad) {
      this.toast.warning('Seleccione el empleado y el tipo de novedad');
      return;
    }
    if (!this.novedadForm.motivo.trim()) {
      this.toast.warning('Describa el motivo o razón válida de la ausencia');
      return;
    }

    const empId = this.novedadForm.empleado_id;
    const emp = this.todosEmpleados.find((e: any) => e.id == empId);
    if (!emp) return;

    this.isSubmitting = true;

    // Si es vacación, también registramos la solicitud en backend
    if (this.novedadForm.tipo_novedad === 'en vacaciones' && emp.usuario_id) {
      this.http.post('/api/vacaciones', {
        usuario_id: emp.usuario_id,
        fecha_inicio: this.novedadForm.fecha_inicio || new Date().toISOString().slice(0, 10),
        fecha_fin: this.novedadForm.fecha_fin || new Date().toISOString().slice(0, 10),
        tipo: 'Disfrute Legal',
        observaciones: this.novedadForm.motivo
      }).subscribe();
    }

    // Actualizar estado del empleado
    this.http.put(`/api/empleados/${empId}`, {
      sede_id: emp.sede_id || 2,
      area_id: emp.area_id || 17,
      cargo_id: emp.cargo_id || 31,
      tipo_contrato: emp.tipo_contrato || 'Indefinido',
      fecha_contratacion: emp.fecha_contratacion ? emp.fecha_contratacion.substring(0, 10) : '2025-01-01',
      salario: emp.salario,
      estado: this.novedadForm.tipo_novedad
    }).pipe(timeout(15000)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.cerrarModalNovedad();
        this.toast.success('Novedad de ausencia registrada con éxito');
        this.cargarEmpleados();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } else {
          this.toast.error('Error al registrar la novedad');
        }
        this.cdr.detectChanges();
      }
    });
  }

  reincorporarEmpleado(emp: any) {
    if (!emp?.id) return;
    this.isSubmitting = true;
    this.http.put(`/api/empleados/${emp.id}`, {
      sede_id: emp.sede_id || 2,
      area_id: emp.area_id || 17,
      cargo_id: emp.cargo_id || 31,
      tipo_contrato: emp.tipo_contrato || 'Indefinido',
      fecha_contratacion: emp.fecha_contratacion ? emp.fecha_contratacion.substring(0, 10) : '2025-01-01',
      salario: emp.salario,
      estado: 'activo'
    }).pipe(timeout(15000)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success('Empleado reincorporado a sus labores activas');
        this.cargarEmpleados();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSubmitting = false;
        this.toast.error('Error al reincorporar el empleado');
        this.cdr.detectChanges();
      }
    });
  }

  obtenerMotivoAusencia(emp: any): string {
    if (!emp) return 'Novedad laboral';
    switch (emp.estado) {
      case 'en vacaciones':
        return 'Vacaciones reglamentarias de ley en curso';
      case 'incapacitado':
        return 'Incapacidad médica general expedida por EPS';
      case 'licencia':
        return 'Licencia remunerada (Maternidad / Paternidad / Luto)';
      case 'permiso':
        return 'Permiso laboral justificado por calamidad o fuerza mayor';
      default:
        return 'Ausencia temporal justificada';
    }
  }

  obtenerIconoAusencia(emp: any): string {
    if (!emp) return 'fas fa-user-clock';
    switch (emp.estado) {
      case 'en vacaciones': return 'fas fa-umbrella-beach';
      case 'incapacitado': return 'fas fa-user-injured';
      case 'licencia': return 'fas fa-baby';
      case 'permiso': return 'fas fa-clipboard-list';
      default: return 'fas fa-user-clock';
    }
  }

  obtenerClaseAusencia(emp: any): string {
    if (!emp) return 'badge-pendiente';
    switch (emp.estado) {
      case 'en vacaciones': return 'badge-vacaciones';
      case 'incapacitado': return 'badge-incapacidad';
      case 'licencia': return 'badge-licencia';
      case 'permiso': return 'badge-permiso';
      default: return 'badge-pendiente';
    }
  }
}