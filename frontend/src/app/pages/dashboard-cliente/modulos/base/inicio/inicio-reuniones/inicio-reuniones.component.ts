import { Component, OnInit, inject , ChangeDetectorRef} from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);
  private reunionService = inject(ReunionService);
  private toast = inject(ToastService);

  reuniones: Reunion[] = [];
  cargando: boolean = false;

  ngOnInit() {
    this.cargarReuniones();
  }

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

  diaReunion(r: Reunion): string {
    if (!r.fecha_hora) return '--';
    const date = new Date(r.fecha_hora);
    return date.getDate().toString();
  }

  mesReunion(r: Reunion): string {
    if (!r.fecha_hora) return '--';
    const date = new Date(r.fecha_hora);
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[date.getMonth()];
  }

  horaReunion(r: Reunion): string {
    if (!r.fecha_hora) return '--:--';
    const date = new Date(r.fecha_hora);
    let h = date.getHours();
    let m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
  }

  organizadorReunion(r: Reunion): string {
    return r.organizador ? r.organizador.nombres + ' ' + r.organizador.apellidos : 'Gerencia / Jefe de Área';
  }
}
