import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private destroyRef = inject(DestroyRef);
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
    this.notifService.getNotificaciones().pipe(
      timeout(35000),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res) => {
        this.notificaciones = res || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
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
