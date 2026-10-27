import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionesService, Notificacion } from '../../../../../../services/notificaciones.service';
import { ToastService } from '../../../../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-inicio-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio-notificaciones.component.html',
  styleUrl: './inicio-notificaciones.component.scss'
})
export class InicioNotificacionesComponent implements OnInit {
  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  private cdr = inject(ChangeDetectorRef);
  private notifService = inject(NotificacionesService);
  private toast = inject(ToastService);

  // --- VARIABLES DE ESTADO ---
  notificaciones: Notificacion[] = [];
  cargando = false;

  // Bloque del ciclo de vida ngOnInit para inicializar y cargar las notificaciones
  ngOnInit() {
    this.cargarNotificaciones();
  }

  // Bloque para consultar el listado de notificaciones del usuario desde el servicio
  cargarNotificaciones() {
    this.cargando = true;
    this.notifService.getNotificaciones().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.notificaciones = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.notificaciones = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para marcar una notificación como leída en la base de datos
  marcarLeida(id: number | undefined) {
    if (!id) return;
    this.notifService.marcarLeida(id).subscribe({
      next: () => this.cargarNotificaciones(),
      error: () => this.toast.error('Error al actualizar notificación')
    });
  }
}
