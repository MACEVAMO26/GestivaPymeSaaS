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
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda-y-calendario.component.html',
  styleUrl: './agenda-y-calendario.component.scss'
})
export class AgendaYCalendarioComponent implements OnInit {
  private agendaService = inject(AgendaService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  esOperativo: boolean = false;

  eventos: EventoCalendario[] = [];
  cargando = false;
  guardando = false;

  busqueda: string = '';
  pageSize = 8;
  pageEventos = 1;

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

  nuevoEvento: EventoCalendario = {
    titulo: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    color_etiqueta: '#45a1ae'
  };

  ngOnInit() {
    const user = this.authService.getUser();
    if (user && user.rol && user.rol.nombre) {
      this.esOperativo = user.rol.nombre.toLowerCase() === 'operativo';
    }
    this.cargarEventos();
  }

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

  guardarEvento() {
    if (!this.nuevoEvento.titulo || !this.nuevoEvento.fecha_inicio || !this.nuevoEvento.fecha_fin) {
      return this.toast.warning('Título, fecha de inicio y fin son obligatorios');
    }

    const fechaInicio = new Date(this.nuevoEvento.fecha_inicio).getTime();
    const fechaFin = new Date(this.nuevoEvento.fecha_fin).getTime();
    const margenTolerancia = Date.now() - (2 * 60 * 1000); // 2 minutos de tolerancia por llenado

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
        this.nuevoEvento = { titulo: '', descripcion: '', fecha_inicio: '', fecha_fin: '', color_etiqueta: '#45a1ae' };
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

