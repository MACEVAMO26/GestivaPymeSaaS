import { VolverDirective } from '../../../../../shared/directives/volver.directive';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TiempoService } from '../../../../../services/tiempo.service';
import { EmpleadoService } from '../../../../../services/empleado.service';
import { AuthService } from '../../../../../services/auth.service';
import { ToastService } from '../../../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-autogestion',
  standalone: true,
  imports: [CommonModule, FormsModule, VolverDirective],
  templateUrl: './autogestion.component.html',
  styleUrl: './autogestion.component.scss'
})
export class AutogestionComponent implements OnInit {
  private tiempoService = inject(TiempoService);
  private empleadoService = inject(EmpleadoService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  usuarioActual: any;
  user: any; // Mapeado del auth service
  pestanaActual = 'vacaciones'; // 'vacaciones' | 'turnos' | 'documentos'
  
  // Bloque de datos de perfil y avatar
  profileImageUrl: string | null = null;
  isUploadingAvatar = false;

  // Bloque de datos de afiliaciones
  afiliacion: any = {};
  formAfiliacion: any = { estado: 'nuevo' };
  isHR = false;
  isSaving = false;
  isSavingAdmin = false;
  cantidadRenovaciones = 0;
  moduloRRHH = false;
  archivoAfiliacion: File | null = null;

  // Bloque de datos globales de ARL y Caja de Compensación de la empresa
  arlEmpresa: string | null = null;
  cajaCompensacionEmpresa: string | null = null;

  // Bloque de datos de vacaciones
  misVacaciones: any[] = [];
  nuevaVacacion = {
    fecha_inicio: '',
    fecha_fin: '',
    tipo: 'Disfrute Legal',
    observaciones: ''
  };
  isSubmittingVacacion = false;
  diasDisponibles = 15; // Por defecto o calculado desde el backend

  get fechaMinimaHoy(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  get fechaMinimaFin(): string {
    if (!this.nuevaVacacion.fecha_inicio) return this.fechaMinimaHoy;
    const d = new Date(this.nuevaVacacion.fecha_inicio + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Bloque para calcular automáticamente la fecha de fin y reincorporación de vacaciones
  onFechaInicioChange() {
    if (this.nuevaVacacion.fecha_fin && this.nuevaVacacion.fecha_fin <= this.nuevaVacacion.fecha_inicio) {
      this.nuevaVacacion.fecha_fin = '';
    }
  }

  // Bloque de documentos
  misDocumentos: any[] = [];
  archivoSeleccionado: File | null = null;
  nombreArchivo = '';

  // Bloque de turnos
  misTurnos: any[] = [];

  cargando = false;
  guardando = false;

  // Bloque de ciclo de vida para inicializar el módulo de autogestión
  ngOnInit() {
    this.usuarioActual = this.authService.getUser();
    this.user = this.usuarioActual;
    
    // Bloque de verificación de rol de Recursos Humanos
    this.isHR = this.user?.rol?.nombre === 'Jefe de Área';
    
    this.cargarVacaciones();
    this.cargarDocumentos();
    this.cargarAfiliacion();
  }

  // --- GESTION DE AVATAR ---
  // Bloque para procesar y subir la nueva foto de perfil del usuario
  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.isUploadingAvatar = true;
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileImageUrl = e.target.result;
        this.isUploadingAvatar = false;
        this.toast.success('Foto de perfil actualizada (simulación)');
      };
      reader.readAsDataURL(file);
    }
  }

  // Bloque para cambiar entre pestañas de autogestión
  cambiarPestana(pestana: string) {
    this.pestanaActual = pestana;
    if (pestana === 'vacaciones') this.cargarVacaciones();
    if (pestana === 'documentos') this.cargarDocumentos();
    if (pestana === 'turnos') this.cargarTurnos();
  }

  // --- GESTION DE AFILIACIONES ---
  // Bloque para cargar la información de afiliaciones del usuario autenticado
  cargarAfiliacion() {
    if (!this.usuarioActual) return;
    this.empleadoService.getMisAfiliaciones().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.afiliacion = res.afiliacion || {};
        this.moduloRRHH = !!res.modulo_rrhh_activo;
        // Bloque de carga de datos globales de Seguridad Social
        this.arlEmpresa = res.arl_empresa || null;
        this.cajaCompensacionEmpresa = res.caja_compensacion_empresa || null;
        const af = this.afiliacion;
        this.formAfiliacion = {
          eps: af.eps || '',
          arl: af.arl || '',
          afondo_pension: af.afondo_pension || '',
          fondo_cesantias: af.fondo_cesantias || '',
          estado: af.estado || 'nuevo',
          fecha_contratacion: af.fecha_contratacion || '',
          finalizacion_contrato: af.finalizacion_contrato || '',
          renovacion_contrato: af.renovacion_contrato || ''
        };
        if (this.isHR) this.formAfiliacion.estado = af.estado || 'nuevo';
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.name === 'TimeoutError') {
          this.toast.error('La operación tardó demasiado, intenta nuevamente.');
        }
        this.afiliacion = {};
        this.moduloRRHH = false;
        this.cdr.detectChanges();
      }
    });
  }

  get puedeModificarAfiliaciones(): boolean {
    if (this.isHR) return true;
    if (this.moduloRRHH) return true;
    const veces = this.afiliacion?.veces_modificada || 0;
    return veces < 2;
  }

  get vecesModificadas(): number {
    return this.afiliacion?.veces_modificada || 0;
  }

  // Bloque para seleccionar archivo de soporte de afiliación
  onAfiliacionFileSelected(event: any) {
    this.archivoAfiliacion = event.target.files[0] || null;
  }

  // Bloque para enviar solicitud de actualización de afiliaciones con soporte
  guardarAfiliaciones() {
    if (!this.puedeModificarAfiliaciones) {
      this.toast.warning('Límite alcanzado: las afiliaciones solo pueden modificarse 2 veces. Contacta a Gestión Humana o Gerencia.');
      return;
    }
    if (!this.formAfiliacion.eps || !this.formAfiliacion.afondo_pension) {
      this.toast.warning('Seleccione EPS y Fondo de Pensión al menos');
      return;
    }
    if (!this.moduloRRHH && !this.archivoAfiliacion) {
      this.toast.warning('Adjunte un documento de soporte (ej. formulario de traslado) para el cambio.');
      return;
    }

    this.isSaving = true;
    const formData = new FormData();
    formData.append('eps', this.formAfiliacion.eps);
    formData.append('arl', this.formAfiliacion.arl || '');
    formData.append('afondo_pension', this.formAfiliacion.afondo_pension);
    formData.append('fondo_cesantias', this.formAfiliacion.fondo_cesantias || '');
    if (this.archivoAfiliacion) {
      formData.append('documento_soporte', this.archivoAfiliacion);
    }

    this.empleadoService.guardarAfiliaciones(formData).pipe(timeout(20000)).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.toast.success(res.message || 'Afiliaciones enviadas a revisión');
        this.archivoAfiliacion = null;
        this.cargarAfiliacion();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        if (err.name === 'TimeoutError') {
          this.toast.error('La operación tardó demasiado, intenta nuevamente.');
        } else {
          this.toast.error(err.error?.message || 'Error al guardar las afiliaciones');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque administrativo para que RRHH apruebe o rechace afiliaciones
  gestionarAfiliacionAdmin() {
    if (!this.usuarioActual?.id) return;
    this.isSavingAdmin = true;
    const formData = new FormData();
    formData.append('eps', this.formAfiliacion.eps || '');
    formData.append('afondo_pension', this.formAfiliacion.afondo_pension || '');
    formData.append('fondo_cesantias', this.formAfiliacion.fondo_cesantias || '');
    formData.append('estado', this.formAfiliacion.estado || 'pendiente');
    formData.append('notas_rechazo', this.formAfiliacion.notas_rechazo || '');
    if (this.formAfiliacion.fecha_contratacion) formData.append('fecha_contratacion', this.formAfiliacion.fecha_contratacion);
    if (this.formAfiliacion.finalizacion_contrato) formData.append('finalizacion_contrato', this.formAfiliacion.finalizacion_contrato);
    if (this.formAfiliacion.renovacion_contrato) formData.append('renovacion_contrato', this.formAfiliacion.renovacion_contrato);
    if (this.archivoAfiliacion) formData.append('documento_soporte', this.archivoAfiliacion);

    this.empleadoService.gestionarAfiliacionEmpleado(this.usuarioActual.id, formData).pipe(timeout(20000)).subscribe({
      next: (res) => {
        this.isSavingAdmin = false;
        this.toast.success(res.message || 'Gestión de afiliación guardada');
        this.archivoAfiliacion = null;
        this.cargarAfiliacion();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSavingAdmin = false;
        if (err.name === 'TimeoutError') {
          this.toast.error('La operación tardó demasiado, intenta nuevamente.');
        } else {
          this.toast.error(err.error?.message || 'Error al gestionar la afiliación');
        }
        this.cdr.detectChanges();
      }
    });
  }

  isGeneratingCert = false;

  descargarCertificado() {
    if (!this.usuarioActual?.id) {
      this.toast.warning('No se pudo identificar el usuario actual');
      return;
    }

    this.isGeneratingCert = true;
    this.toast.info('Generando tu certificado laboral oficial en PDF...');

    this.empleadoService.descargarCertificado(this.usuarioActual.id).subscribe({
      next: (blob: any) => {
        this.isGeneratingCert = false;
        const file = new Blob([blob], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        
        // Bloque para abrir el documento en nueva pestaña
        window.open(fileURL, '_blank');
        
        // Bloque para descargar automáticamente el archivo PDF
        const a = document.createElement('a');
        a.href = fileURL;
        a.download = `Certificado_Laboral_${this.usuarioActual.documento || this.usuarioActual.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        this.toast.success('Certificado laboral generado exitosamente');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isGeneratingCert = false;
        this.toast.error('No se pudo generar el certificado. Verifica que tu formalización esté completa.');
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para descargar el contrato laboral firmado en PDF
  descargarContrato() {
    this.toast.success('Descargando copia del contrato...');
  }

  // --- GESTION DE VACACIONES ---
  // Bloque para cargar el historial de vacaciones y días hábiles disponibles
  cargarVacaciones() {
    if (!this.usuarioActual) return;
    this.cargando = true;
    this.tiempoService.getMisVacaciones(this.usuarioActual.id).pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.misVacaciones = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.name === 'TimeoutError') {
          this.toast.error('La operación tardó demasiado, intenta nuevamente.');
        }
        this.misVacaciones = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para solicitar días de vacaciones laborales
  solicitarVacaciones() {
    if (!this.nuevaVacacion.fecha_inicio || !this.nuevaVacacion.fecha_fin) {
      this.toast.warning('Complete las fechas de inicio y fin');
      return;
    }

    const hoyStr = this.fechaMinimaHoy;
    if (this.nuevaVacacion.fecha_inicio < hoyStr) {
      this.toast.warning('La fecha de inicio de vacaciones no puede ser anterior a la fecha de hoy');
      return;
    }

    if (this.nuevaVacacion.fecha_fin <= this.nuevaVacacion.fecha_inicio) {
      this.toast.warning('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }
    
    this.isSubmittingVacacion = true;
    const payload = { ...this.nuevaVacacion, usuario_id: this.usuarioActual?.id };
    
    this.tiempoService.solicitarVacaciones(payload).subscribe({
      next: () => {
        this.toast.success('Solicitud enviada al administrador con éxito');
        this.isSubmittingVacacion = false;
        this.nuevaVacacion = { fecha_inicio: '', fecha_fin: '', tipo: 'Disfrute Legal', observaciones: '' };
        this.cargarVacaciones();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.error?.error || 'Error al enviar la solicitud';
        this.toast.error(msg);
        this.isSubmittingVacacion = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- GESTION DE DOCUMENTOS ---
  // Bloque para cargar los documentos laborales del empleado
  cargarDocumentos() {
    this.cargando = true;
    this.empleadoService.getMisDocumentos().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.misDocumentos = res;
        this.cargando = false;
      },
      error: () => {
        this.misDocumentos = [];
        this.cargando = false;
      }
    });
  }

  // Bloque para subir un nuevo documento laboral con archivo adjunto
  subirDocumento() {
    if (!this.archivoSeleccionado || !this.nombreArchivo || !this.usuarioActual) {
      this.toast.warning('Complete nombre y seleccione un archivo');
      return;
    }

    this.guardando = true;
    const formData = new FormData();
    formData.append('documento', this.archivoSeleccionado);
    formData.append('nombre', this.nombreArchivo);
    
    this.empleadoService.uploadDocumento(this.usuarioActual.id, formData).subscribe({
      next: () => {
        this.toast.success('Documento subido correctamente');
        this.guardando = false;
        this.nombreArchivo = '';
        this.archivoSeleccionado = null;
        this.cargarDocumentos();
      },
      error: () => {
        this.toast.error('Error al subir el documento');
        this.guardando = false;
      }
    });
  }

  // Bloque para eliminar un documento laboral existente
  eliminarDocumento(id: number) {
    if (confirm('¿Eliminar este documento?')) {
      this.empleadoService.deleteDocumento(id).subscribe({
        next: () => {
          this.toast.success('Documento eliminado');
          this.cargarDocumentos();
        },
        error: () => this.toast.error('Error al eliminar')
      });
    }
  }

  // --- GESTION DE TURNOS ---
  // Bloque para cargar los turnos de trabajo asignados al empleado
  cargarTurnos() {
    this.cargando = true;
    this.tiempoService.getTurnos().subscribe({
      next: (res) => {
        this.misTurnos = res;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }
}
