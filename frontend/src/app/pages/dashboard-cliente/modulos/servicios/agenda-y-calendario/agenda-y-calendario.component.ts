import { VolverDirective } from '../../../../../shared/directives/volver.directive';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendaService, EventoCalendario } from '../../../../../services/agenda.service';
import { ToastService } from '../../../../../services/toast.service';
import { AuthService } from '../../../../../services/auth.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-agenda-y-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, VolverDirective],
  templateUrl: './agenda-y-calendario.component.html',
  styleUrl: './agenda-y-calendario.component.scss'
})
export class AgendaYCalendarioComponent implements OnInit {
  // --- SERVICIOS INYECTADOS ---
  private agendaService = inject(AgendaService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  // --- VARIABLES DE ESTADO ---
  esOperativo = false;
  eventos: EventoCalendario[] = [];
  cargando = false;
  guardando = false;
  busqueda = '';
  pageSize = 8;
  pageEventos = 1;

  // --- PRIORIDADES UNIFICADAS EN 5 COLORES ---
  prioridades = [
    { id: 'urgente', nombre: '1. Urgente', color: '#dc2626', bgPastel: '#fee2e2', textPastel: '#991b1b', icono: 'fas fa-exclamation-circle' },
    { id: 'alta', nombre: '2. Alta', color: '#ea580c', bgPastel: '#ffedd5', textPastel: '#9a3412', icono: 'fas fa-arrow-up' },
    { id: 'media', nombre: '3. Media', color: '#d97706', bgPastel: '#fef3c7', textPastel: '#92400e', icono: 'fas fa-minus' },
    { id: 'baja', nombre: '4. Baja', color: '#2563eb', bgPastel: '#dbeafe', textPastel: '#1e40af', icono: 'fas fa-arrow-down' },
    { id: 'rutinaria', nombre: '5. Rutinaria', color: '#16a34a', bgPastel: '#dcfce7', textPastel: '#166534', icono: 'fas fa-calendar-check' }
  ];

  nuevoEvento: EventoCalendario = {
    titulo: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    color_etiqueta: '#d97706'
  };

  seleccionarColor(color: string) {
    this.nuevoEvento.color_etiqueta = color;
  }

  getPrioridad(color?: string) {
    if (!color) return this.prioridades[2];
    const match = this.prioridades.find(p => p.color.toLowerCase() === color.toLowerCase());
    return match || {
      id: 'personalizado',
      nombre: 'Media',
      color: color,
      bgPastel: '#fef3c7',
      textPastel: '#92400e',
      icono: 'fas fa-tag'
    };
  }

  // --- GETTERS Y PROPIEDADES CALCULADAS ---
  get fechaMinimaActual(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  get eventosFiltrados(): EventoCalendario[] {
    if (!this.busqueda.trim()) return this.eventos;
    const term = this.busqueda.toLowerCase();
    return this.eventos.filter(e =>
      (e.titulo && e.titulo.toLowerCase().includes(term)) ||
      (e.descripcion && e.descripcion.toLowerCase().includes(term)) ||
      (e.fecha_inicio && e.fecha_inicio.toLowerCase().includes(term))
    );
  }

  get paginatedEventos(): EventoCalendario[] {
    const start = (this.pageEventos - 1) * this.pageSize;
    return this.eventosFiltrados.slice(start, start + this.pageSize);
  }

  get totalPagesEventos(): number {
    return Math.ceil(this.eventosFiltrados.length / this.pageSize) || 1;
  }

  // Bloque de ciclo de vida OnInit para cargar rol y eventos
  ngOnInit() {
    const user = this.authService.getUser();
    if (user && user.rol && user.rol.nombre) {
      this.esOperativo = user.rol.nombre.toLowerCase() === 'operativo';
    }
    this.cargarEventos();
  }

  // Bloque para cargar la lista de eventos desde la API
  cargarEventos() {
    this.cargando = true;
    this.agendaService.getEventos().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.eventos = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } else {
          this.toast.error('Error al cargar la agenda');
        }
        this.eventos = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para validar y guardar un nuevo evento en el calendario
  guardarEvento() {
    if (!this.nuevoEvento.titulo || !this.nuevoEvento.fecha_inicio || !this.nuevoEvento.fecha_fin) {
      return this.toast.warning('Título, fecha de inicio y fin son obligatorios');
    }

    const fechaInicio = new Date(this.nuevoEvento.fecha_inicio).getTime();
    const fechaFin = new Date(this.nuevoEvento.fecha_fin).getTime();
    const margenTolerancia = Date.now() - (2 * 60 * 1000);

    if (fechaInicio < margenTolerancia) {
      return this.toast.warning('No es posible agendar eventos en fechas u horas pasadas');
    }

    if (fechaFin < fechaInicio) {
      return this.toast.warning('La fecha y hora de fin debe ser posterior a la fecha de inicio');
    }

    this.guardando = true;
    this.agendaService.crearEvento(this.nuevoEvento).pipe(timeout(10000)).subscribe({
      next: () => {
        this.toast.success('Evento agendado con éxito');
        this.nuevoEvento = { titulo: '', descripcion: '', fecha_inicio: '', fecha_fin: '', color_etiqueta: '#d97706' };
        this.cargarEventos();
        this.guardando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } else if (err?.error?.message) {
          this.toast.error(err.error.message);
        } else {
          this.toast.error('Error al guardar el evento');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }
}
