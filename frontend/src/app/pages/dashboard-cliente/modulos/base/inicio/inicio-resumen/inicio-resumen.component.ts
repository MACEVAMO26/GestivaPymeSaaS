import { Component, OnInit, inject , ChangeDetectorRef} from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);
  private tareaService = inject(TareaService);
  private reunionService = inject(ReunionService);
  private clienteService = inject(ClienteService);
  private notificacionesService = inject(NotificacionesService);

  tareasPendientes = 0;
  reunionesHoy = 0;
  nuevosClientes = 0;
  notificaciones = 0;

  ngOnInit() {
    this.cargarTareas();
    this.cargarReuniones();
    this.cargarClientes();
    this.cargarNotificaciones();
  }

  cargarTareas() {
    this.tareaService.getTareas().pipe(timeout(15000)).subscribe({
      next: (tareas) => {
        this.tareasPendientes = tareas.filter(t => t.estado !== 'terminada').length;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          console.error('Tiempo de espera agotado');
        }
        this.cdr.detectChanges();}
    });
  }

  cargarReuniones() {
    this.reunionService.getReuniones().pipe(timeout(15000)).subscribe({
      next: (reuniones) => {
        const hoy = new Date().toISOString().substring(0, 10);
        this.reunionesHoy = reuniones.filter(r => (r.fecha_hora || '').substring(0, 10) === hoy).length;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          console.error('Tiempo de espera agotado');
        }
        this.cdr.detectChanges();}
    });
  }

  cargarClientes() {
    this.clienteService.getClientes().pipe(timeout(15000)).subscribe({
      next: (clientes) => {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        this.nuevosClientes = clientes.filter(c => {
          const fecha = c.created_at ? new Date(c.created_at) : null;
          return fecha && fecha >= inicioMes;
        }).length;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          console.error('Tiempo de espera agotado');
        }
        this.cdr.detectChanges();}
    });
  }

  cargarNotificaciones() {
    this.notificacionesService.getNotificaciones().pipe(timeout(15000)).subscribe({
      next: (notificaciones) => {
        this.notificaciones = notificaciones.filter(n => !n.leida).length;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          console.error('Tiempo de espera agotado');
        }
        this.cdr.detectChanges();}
    });
  }
}