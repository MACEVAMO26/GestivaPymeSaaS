import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendaService, EventoCalendario } from '../../../../../../services/agenda.service';
import { ToastService } from '../../../../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-inicio-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio-calendario.component.html',
  styleUrl: './inicio-calendario.component.scss'
})
export class InicioCalendarioComponent implements OnInit {
  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  private cdr = inject(ChangeDetectorRef);
  private agendaService = inject(AgendaService);
  private toast = inject(ToastService);

  // --- VARIABLES DE ESTADO Y CALENDARIO ---
  mesActual = new Date();
  diasDelMes: {dia: number, hoy: boolean, evento: boolean, eventos: EventoCalendario[], fechaISO: string}[] = [];
  diasVacios: number[] = [];
  nombreMes = '';
  diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  diaSeleccionado: {dia: number, hoy: boolean, evento: boolean, eventos: EventoCalendario[], fechaISO: string} | null = null;
  eventosDelDia: EventoCalendario[] = [];

  // Bloque del ciclo de vida ngOnInit para inicializar y cargar los eventos de la agenda
  ngOnInit() {
    this.cargarEventos();
  }

  // Bloque para consultar los eventos de calendario del usuario desde el servicio de agenda
  cargarEventos() {
    this.agendaService.getEventos().pipe(timeout(15000)).subscribe({
      next: (eventos) => {
        this.generarCalendario(eventos);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.generarCalendario([]);
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para generar la grilla interactiva de días del mes actual con sus respectivos eventos
  generarCalendario(eventos: EventoCalendario[] = []) {
    const anio = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.nombreMes = `${meses[mes]} ${anio}`;

    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);

    let diaSemanaInicio = primerDia.getDay() - 1;
    if (diaSemanaInicio === -1) diaSemanaInicio = 6;

    this.diasVacios = Array(diaSemanaInicio).fill(0);

    const hoy = new Date();
    this.diasDelMes = [];

    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      const fechaActualDia = new Date(anio, mes, i);
      const fechaISO = fechaActualDia.toISOString().substring(0, 10);
      
      const esHoy = hoy.getFullYear() === anio && hoy.getMonth() === mes && hoy.getDate() === i;
      const eventosDia = eventos.filter(e => (e.fecha_inicio || '').substring(0, 10) === fechaISO);

      this.diasDelMes.push({
        dia: i,
        hoy: esHoy,
        evento: eventosDia.length > 0,
        eventos: eventosDia,
        fechaISO
      });
    }

    const diaHoyObj = this.diasDelMes.find(d => d.hoy);
    if (diaHoyObj) {
      this.seleccionarDia(diaHoyObj);
    } else if (this.diasDelMes.length > 0) {
      this.seleccionarDia(this.diasDelMes[0]);
    }
  }

  // Bloque para retroceder un mes en la visualización del calendario
  mesAnterior() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.cargarEventos();
  }

  // Bloque para avanzar un mes en la visualización del calendario
  mesSiguiente() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.cargarEventos();
  }

  // Bloque para seleccionar un día de la cuadrícula y desplegar sus eventos programados
  seleccionarDia(dia: {dia: number, hoy: boolean, evento: boolean, eventos: EventoCalendario[], fechaISO: string}) {
    this.diaSeleccionado = dia;
    this.eventosDelDia = dia.eventos;
  }
}
