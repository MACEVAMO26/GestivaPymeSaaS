import { Component, OnInit, inject , ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner';
import { FormsModule } from '@angular/forms';
import { TareaService, Tarea } from '../../../../../services/tarea.service';
import { EmpleadoService } from '../../../../../services/empleado.service';
import { AuthService } from '../../../../../services/auth.service';
import { ToastService } from '../../../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-gestion-de-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './gestion-de-tareas.component.html',
  styleUrl: './gestion-de-tareas.component.scss'
})
export class GestionDeTareasComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private tareaService = inject(TareaService);
  private empleadoService = inject(EmpleadoService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  tareas: Tarea[] = [];
  empleados: any[] = [];
  areas: any[] = [];
  user: any = null;
  cargando = false;
  guardando = false;
  activeTab: string = 'asignacion';

  constructor() {
    this.user = this.authService.getUser();
  }

  get esGerenteOjefe(): boolean {
    const rol = this.user?.rol?.nombre || '';
    return rol === 'Gerente General' || rol === 'Gerente' || rol === 'Jefe de Área';
  }

  get esOperativo(): boolean {
    const rol = this.user?.rol?.nombre || '';
    return rol === 'Operativo' || (!!this.user?.id && !this.esGerenteOjefe);
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  get tareasActuales() {
    return this.tareas.filter(t => t.estado !== 'terminada');
  }

  get tareasEntregadas() {
    return this.tareas.filter(t => t.estado === 'terminada');
  }

  // Formulario
  nuevaTarea: Tarea = {
    titulo: '',
    descripcion: '',
    asignado_id: 0,
    tipo: 'individual',
    area_id: undefined
  };

  ngOnInit(): void {
    this.cargarTareas();
    this.cargarEmpleados();
    this.cargarAreas();
  }

  cargarTareas() {
    this.cargando = true;
    this.tareaService.getTareas().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.tareas = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.tareas = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarEmpleados() {
    this.empleadoService.getEmpleados().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.empleados = res;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.empleados = [];
        this.cdr.detectChanges();
      }
    });
  }

  cargarAreas() {
    this.empleadoService.getAreas().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.areas = res;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.areas = [];
        this.cdr.detectChanges();
      }
    });
  }

  setTipo(tipo: string) {
    this.nuevaTarea.tipo = tipo as 'individual' | 'cooperativa';
  }

  crearTarea() {
    if (this.esOperativo) {
      // El operario solo puede asignarse tareas a sí mismo (individual)
      this.nuevaTarea.tipo = 'individual';
      this.nuevaTarea.asignado_id = this.user?.id;
    }

    if (!this.nuevaTarea.titulo || !this.nuevaTarea.asignado_id) {
      this.toast.warning('Complete los campos obligatorios (Título y Asignado)');
      return;
    }
    if (this.nuevaTarea.tipo === 'cooperativa' && !this.nuevaTarea.area_id) {
      this.toast.warning('Seleccione el área para la tarea cooperativa');
      return;
    }

    this.guardando = true;
    this.tareaService.crearTarea(this.nuevaTarea).pipe(timeout(10000)).subscribe({
      next: (res) => {
        this.guardando = false;
        this.toast.success('Tarea asignada con éxito');
        this.cargarTareas();
        this.nuevaTarea = { titulo: '', descripcion: '', asignado_id: this.esOperativo ? (this.user?.id || 0) : 0, tipo: 'individual', area_id: undefined };
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.guardando = false;
        this.toast.error(err.error?.message || 'No se pudo guardar la tarea');
        this.cdr.detectChanges();
      }
    });
  }

  actualizarEstado(id: number | undefined, nuevoEstado: string) {
    if (!id || !nuevoEstado) return;
    this.tareaService.actualizarEstado(id, nuevoEstado).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Estado actualizado');
        this.cargarTareas();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.toast.error('Error al actualizar estado');
        this.cdr.detectChanges();
      }
    });
  }

  // --- AYUDAS DE RENDERIZADO ---
  nombreUsuario(u: any): string {
    if (!u) return 'â€”';
    return [u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido].filter(Boolean).join(' ');
  }

  nombreArea(t: Tarea): string {
    return (t as any)?.area?.nombre || 'â€”';
  }

  etiquetaEstado(estado?: string): string {
    const mapa: any = {
      notificada: 'Notificada',
      vista: 'Vista',
      en_proceso: 'En Proceso',
      con_dificultades: 'Con Dificultades',
      terminada: 'Terminada'
    };
    return mapa[estado || ''] || estado || 'â€”';
  }

  claseEstado(estado?: string): string {
    const mapa: any = {
      notificada: 'badge-notificada',
      vista: 'badge-vista',
      en_proceso: 'badge-proceso',
      con_dificultades: 'badge-dificultades',
      terminada: 'badge-terminada'
    };
    return mapa[estado || ''] || '';
  }

  puedeEditarEstado(t: Tarea): boolean {
    if (!this.user) return false;
    return t.asignado_id === this.user.id || t.asignador_id === this.user.id;
  }

  esCooperativa(t: Tarea): boolean {
    return t.tipo === 'cooperativa';
  }
}

