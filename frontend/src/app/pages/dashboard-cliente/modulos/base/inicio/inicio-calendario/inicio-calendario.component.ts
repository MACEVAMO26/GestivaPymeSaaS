import { Component, OnInit, inject , ChangeDetectorRef} from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);
  private agendaService = inject(AgendaService);
  private toast = inject(ToastService);

  mesActual = new Date();
  diasDelMes: {dia: number, hoy: boolean, evento: boolean, eventos: EventoCalendario[], fechaISO: string}[] = [];
  diasVacios: number[] = [];
  nombreMes = '';
  
  diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  diaSeleccionado: {dia: number, hoy: boolean, evento: boolean, eventos: EventoCalendario[], fechaISO: string} | null = null;
  eventosDelDia: EventoCalendario[] = [];

  ngOnInit() {
    this.cargarEventos();
  }

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

  // Genera la grilla de días del mes actual
  generarCalendario(eventos: EventoCalendario[] = []) {
    const anio = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.nombreMes = `${meses[mes]} ${anio}`;

    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);
    const totalDias = ultimoDia.getDate();

    let diaInicio = primerDia.getDay() - 1;
    if (diaInicio < 0) diaInicio = 6;

    this.diasVacios = Array(diaInicio).fill(0);

    const hoy = new Date();
    this.diasDelMes = [];
    for (let d = 1; d <= totalDias; d++) {
      const fechaISO = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const delDia = eventos.filter(ev => {
        const inicio = (ev.fecha_inicio || '').substring(0, 10);
        return inicio === fechaISO;
      });
      
      const diaObj = {
        dia: d,
        hoy: (d === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear()),
        evento: delDia.length > 0,
        eventos: delDia,
        fechaISO: fechaISO
      };
      
      this.diasDelMes.push(diaObj);

      // Si es hoy, lo seleccionamos por defecto
      if (diaObj.hoy && !this.diaSeleccionado) {
        this.seleccionarDia(diaObj);
      }
    }
    
    // Si no se seleccionó el día actual (por estar en otro mes), seleccionar el día 1
    if (!this.diaSeleccionado && this.diasDelMes.length > 0) {
      this.seleccionarDia(this.diasDelMes[0]);
    }
  }

  seleccionarDia(dia: any) {
    this.diaSeleccionado = dia;
    this.eventosDelDia = dia.eventos;
  }

  // Navegar al mes anterior
  mesAnterior() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.diaSeleccionado = null;
    this.cargarEventos();
  }

  // Navegar al mes siguiente
  mesSiguiente() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.diaSeleccionado = null;
    this.cargarEventos();
  }
}