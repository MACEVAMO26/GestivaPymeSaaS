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
        } else {
          this.toast.error('Error al guardar el evento');
        }
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }
}

