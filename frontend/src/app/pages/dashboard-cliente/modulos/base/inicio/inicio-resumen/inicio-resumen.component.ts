import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TareaService } from '../../../../../../services/tarea.service';
import { ReunionService } from '../../../../../../services/reunion.service';
import { ClienteService } from '../../../../../../services/cliente.service';
import { NotificacionesService } from '../../../../../../services/notificaciones.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-inicio-resumen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio-resumen.component.html',
  styleUrl: './inicio-resumen.component.scss'
})
export class InicioResumenComponent implements OnInit {
  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  private cdr = inject(ChangeDetectorRef);
  private tareaService = inject(TareaService);
  private reunionService = inject(ReunionService);
  private clienteService = inject(ClienteService);
  private notificacionesService = inject(NotificacionesService);

  // --- VARIABLES DE ESTADO Y MÉTRICAS ---
  tareasPendientes = 0;
  reunionesHoy = 0;
  nuevosClientes = 0;
  notificaciones = 0;

  // Bloque del ciclo de vida ngOnInit para inicializar y cargar métricas de resumen
  ngOnInit() {
    this.cargarTareas();
    this.cargarReuniones();
    this.cargarClientes();
    this.cargarNotificaciones();
  }

  // Bloque para consultar y contabilizar el número de tareas pendientes
  cargarTareas() {
    this.tareaService.getTareas().pipe(timeout(15000)).subscribe({
      next: (tareas) => {
        this.tareasPendientes = tareas.filter(t => t.estado !== 'terminada').length;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          console.error('Tiempo de espera agotado cargando tareas');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para consultar y contabilizar las reuniones programadas para el día de hoy
  cargarReuniones() {
    this.reunionService.getReuniones().pipe(timeout(15000)).subscribe({
      next: (reuniones) => {
        const hoy = new Date().toISOString().substring(0, 10);
        this.reunionesHoy = reuniones.filter(r => (r.fecha_hora || '').substring(0, 10) === hoy).length;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          console.error('Tiempo de espera agotado cargando reuniones');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para consultar y contabilizar el total de clientes registrados
  cargarClientes() {
    this.clienteService.getClientes().pipe(timeout(15000)).subscribe({
      next: (clientes) => {
        this.nuevosClientes = (clientes || []).length;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          console.error('Tiempo de espera agotado cargando clientes');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para consultar y contabilizar las notificaciones activas no leídas
  cargarNotificaciones() {
    this.notificacionesService.getNotificaciones().pipe(timeout(15000)).subscribe({
      next: (notifs) => {
        this.notificaciones = (notifs || []).filter(n => !n.leida).length;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          console.error('Tiempo de espera agotado cargando notificaciones');
        }
        this.cdr.detectChanges();
      }
    });
  }
}
