import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private recordatoriosService = inject(RecordatoriosService);
  private toast = inject(ToastService);

  // --- VARIABLES DE ESTADO ---
  recordatorios: Recordatorio[] = [];
  nuevoTitulo = '';
  nuevaDescripcion = '';
  guardando = false;
  cargando = false;

  // Bloque del ciclo de vida ngOnInit para inicializar y cargar los recordatorios
  ngOnInit() {
    this.cargarRecordatorios();
  }

  // Bloque para consultar la lista de recordatorios activos desde el backend
  cargarRecordatorios() {
    this.cargando = true;
    this.recordatoriosService.getRecordatorios().pipe(
      timeout(35000),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res) => {
        this.recordatorios = res || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.recordatorios = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para registrar un nuevo recordatorio en la base de datos
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
      },
      error: (err: any) => {
        this.guardando = false;
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado al guardar recordatorio');
        } else {
          this.toast.error('Error al guardar recordatorio');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para alternar el estado de completado de un recordatorio
  marcar(id: number | undefined, completado: boolean) {
    if (!id) return;
    this.recordatoriosService.marcarCompletado(id, completado).subscribe({
      next: () => this.cargarRecordatorios(),
      error: () => this.toast.error('Error al actualizar recordatorio')
    });
  }

  // Bloque para eliminar un recordatorio del listado
  eliminar(id: number | undefined) {
    if (!id) return;
    this.recordatoriosService.eliminarRecordatorio(id).subscribe({
      next: () => this.cargarRecordatorios(),
      error: () => this.toast.error('Error al eliminar recordatorio')
    });
  }
}
