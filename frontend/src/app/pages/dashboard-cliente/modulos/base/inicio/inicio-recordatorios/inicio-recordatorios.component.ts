import { Component, OnInit, inject , ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecordatoriosService, Recordatorio } from '../../../../../../services/recordatorios.service';
import { ToastService } from '../../../../../../services/toast.service';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-inicio-recordatorios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio-recordatorios.component.html',
  styleUrl: './inicio-recordatorios.component.scss'
})
export class InicioRecordatoriosComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private recordatoriosService = inject(RecordatoriosService);
  private toast = inject(ToastService);

  recordatorios: Recordatorio[] = [];
  nuevoTitulo = '';
  nuevaDescripcion = '';
  guardando = false;
  cargando = false;

  ngOnInit() {
    this.cargarRecordatorios();
  }

  cargarRecordatorios() {
    this.cargando = true;
    this.recordatoriosService.getRecordatorios().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.recordatorios = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.recordatorios = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  agregar() {
    if (!this.nuevoTitulo) return;
    this.guardando = true;
    
    const payload = {
      titulo: this.nuevoTitulo,
      descripcion: this.nuevaDescripcion,
      completado: false
    };

    this.recordatoriosService.agregarRecordatorio(payload).pipe(timeout(10000)).subscribe({
      next: () => {
        this.nuevoTitulo = '';
        this.nuevaDescripcion = '';
        this.guardando = false;
        this.cargarRecordatorios();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.guardando = false;
        this.toast.error('No se pudo guardar el recordatorio');
        this.cdr.detectChanges();
      }
    });
  }

  marcar(id: number | undefined, completado: boolean) {
    if (!id) return;
    this.recordatoriosService.marcarCompletado(id, completado).subscribe({
      next: () => this.cargarRecordatorios(),
      error: () => this.toast.error('Error al actualizar recordatorio')
    });
  }

  eliminar(id: number | undefined) {
    if (!id) return;
    this.recordatoriosService.eliminarRecordatorio(id).pipe(timeout(10000)).subscribe({
      next: () => this.cargarRecordatorios(),
      error: () => this.toast.error('Error al eliminar recordatorio')
    });
  }
}
