import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReunionService, Reunion } from '../../../../../../services/reunion.service';
import { ToastService } from '../../../../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-inicio-reuniones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio-reuniones.component.html',
  styleUrl: './inicio-reuniones.component.scss'
})
export class InicioReunionesComponent implements OnInit {
  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  private cdr = inject(ChangeDetectorRef);
  private reunionService = inject(ReunionService);
  private toast = inject(ToastService);

  // --- VARIABLES DE ESTADO ---
  reuniones: Reunion[] = [];
  cargando: boolean = false;

  // Bloque del ciclo de vida ngOnInit para inicializar y cargar las reuniones
  ngOnInit() {
    this.cargarReuniones();
  }

  // Bloque para consultar el listado de reuniones programadas del usuario
  cargarReuniones() {
    this.cargando = true;
    this.reunionService.getReuniones().pipe(timeout(15000)).subscribe({
      next: (data) => {
        this.reuniones = data.slice(0, 5);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado cargando reuniones');
        }
        this.reuniones = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque helper para extraer el día numérico de la fecha de reunión
  diaReunion(r: Reunion): string {
    if (!r.fecha_hora) return '--';
    const date = new Date(r.fecha_hora);
    return date.getDate().toString();
  }

  // Bloque helper para extraer el mes abreviado de la fecha de reunión
  mesReunion(r: Reunion): string {
    if (!r.fecha_hora) return '--';
    const date = new Date(r.fecha_hora);
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[date.getMonth()];
  }

  // Bloque helper para formatear la hora de la reunión
  horaReunion(r: Reunion): string {
    if (!r.fecha_hora) return '--:--';
    const date = new Date(r.fecha_hora);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Bloque helper para obtener el nombre del organizador de la reunión
  organizadorReunion(r: Reunion): string {
    return r.organizador ? `${r.organizador.nombres} ${r.organizador.apellidos || ''}`.trim() : 'Sin asignar';
  }
}
