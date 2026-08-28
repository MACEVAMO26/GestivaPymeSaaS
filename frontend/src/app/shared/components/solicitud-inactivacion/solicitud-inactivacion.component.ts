import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { SolicitudService, Solicitud } from '../../../services/solicitud.service';
import { ToastService } from '../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-solicitud-inactivacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitud-inactivacion.component.html',
  styleUrl: './solicitud-inactivacion.component.scss'
})
export class SolicitudInactivacionComponent implements OnInit {
  @Input() area: string = '';
  @Input() entidad: string = '';
  @Input() entidadId: number | undefined;
  @Input() nombreEntidad: string = '';
  @Input() label: string = 'Solicitar inactivación';

  private authService = inject(AuthService);
  private solicitudService = inject(SolicitudService);
  private toast = inject(ToastService);

  user: any = null;
  esDecisor = false;
  esOperativo = false;

  isOpen = false;
  cargando = false;
  isSubmitting = false;

  solicitudes: Solicitud[] = [];
  motivo = '';

  // Hilo
  solicitudAbierta: Solicitud | null = null;
  mensajeReplica = '';
  notaFinal = '';
  accionDecidir: 'aprobar' | 'rechazar' | '' = '';

  constructor() {
    this.user = this.authService.getUser();
    const rol = this.user?.rol?.nombre || '';
    this.esDecisor = rol === 'Gerente General' || rol === 'Jefe de Área';
    this.esOperativo = !this.esDecisor;
  }

  ngOnInit(): void {}

  abrir() {
    this.isOpen = true;
    this.cargar();
  }

  cerrar() {
    this.isOpen = false;
    this.solicitudAbierta = null;
    this.mensajeReplica = '';
    this.notaFinal = '';
    this.accionDecidir = '';
    this.motivo = '';
  }

  cargar() {
    this.cargando = true;
    this.solicitudes = [];
    this.solicitudService.getMisSolicitudes().pipe(timeout(8000)).subscribe({
      next: (res) => {
        this.solicitudes = (res || []).filter((s) =>
          s.area === this.area && s.entidad === this.entidad && s.entidad_id === this.entidadId
        );
        if (this.esDecisor) {
          this.solicitudService.getBandeja().pipe(timeout(8000)).subscribe({
            next: (bandeja) => {
              const pendientes = (bandeja || []).filter((s) =>
                s.area === this.area && s.entidad === this.entidad && s.entidad_id === this.entidadId &&
                !this.solicitudes.some((ex) => ex.id === s.id)
              );
              this.solicitudes = [...this.solicitudes, ...pendientes].sort((a, b) => (a.id > b.id ? -1 : 1));
              this.cargando = false;
            },
            error: () => { this.cargando = false; }
          });
        } else {
          this.cargando = false;
        }
      },
      error: () => { this.cargando = false; }
    });
  }

  crearSolicitud() {
    if (!this.motivo.trim()) {
      this.toast.warning('Describa el motivo de la solicitud');
      return;
    }
    if (!this.entidadId) {
      this.toast.warning('No se pudo identificar el registro');
      return;
    }
    this.isSubmitting = true;
    this.solicitudService.crear({
      area: this.area,
      entidad: this.entidad,
      entidad_id: this.entidadId,
      accion: 'Inactivar registro',
      motivo: this.motivo
    }).pipe(timeout(8000)).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toast.success(res.message || 'Solicitud enviada');
        this.motivo = '';
        this.cargar();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(err.error?.error || err.error?.message || 'Error al enviar la solicitud');
      }
    });
  }

  abrirHilo(s: Solicitud) {
    this.solicitudAbierta = this.solicitudAbierta?.id === s.id ? null : s;
    this.mensajeReplica = '';
    this.notaFinal = '';
    this.accionDecidir = '';
  }

  esParticipante(s: Solicitud): boolean {
    return s.solicitante_id === this.user?.id || s.decisor_id === this.user?.id;
  }

  esDecisorDe(s: Solicitud): boolean {
    return this.esDecisor && s.solicitante_id !== this.user?.id;
  }

  responder(s: Solicitud) {
    if (!this.mensajeReplica.trim()) return;
    this.isSubmitting = true;
    this.solicitudService.responder(s.id, this.mensajeReplica).pipe(timeout(8000)).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toast.success(res.message || 'Respuesta enviada');
        this.mensajeReplica = '';
        this.cargar();
      },
      error: () => {
        this.isSubmitting = false;
        this.toast.error('Error al responder');
      }
    });
  }

  decidir(s: Solicitud, accion: 'aprobar' | 'rechazar') {
    this.accionDecidir = accion;
    this.notaFinal = '';
  }

  confirmarDecision(s: Solicitud) {
    if (this.accionDecidir === 'rechazar' && !this.notaFinal.trim()) {
      this.toast.warning('Escriba una nota para rechazar');
      return;
    }
    this.isSubmitting = true;
    const obs = this.accionDecidir === 'aprobar'
      ? this.solicitudService.aprobar(s.id, this.notaFinal)
      : this.solicitudService.rechazar(s.id, this.notaFinal);
    obs.pipe(timeout(10000)).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toast.success(res.message || 'Solicitud actualizada');
        this.accionDecidir = '';
        this.notaFinal = '';
        this.cargar();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(err.error?.error || err.error?.message || 'Error al procesar la solicitud');
      }
    });
  }

  nombreUsuario(u: any): string {
    if (!u) return 'â€”';
    return [u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido].filter(Boolean).join(' ');
  }

  etiquetaEstado(s: Solicitud): string {
    const mapa: any = {
      pendiente: 'Pendiente',
      en_replica: 'En réplica',
      ejecutada: 'Ejecutada',
      rechazada: 'Rechazada'
    };
    return mapa[s.estado] || s.estado;
  }

  claseEstado(s: Solicitud): string {
    const mapa: any = {
      pendiente: 'badge-pendiente',
      en_replica: 'badge-replica',
      ejecutada: 'badge-ejecutada',
      rechazada: 'badge-rechazada'
    };
    return mapa[s.estado] || '';
  }
}
