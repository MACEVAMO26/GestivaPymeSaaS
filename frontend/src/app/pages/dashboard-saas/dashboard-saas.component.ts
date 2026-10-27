import { Component, Input, Output, EventEmitter, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { RecordatoriosService, Recordatorio } from '../../services/recordatorios.service';

@Component({
  selector: 'app-dashboard-saas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-saas.component.html',
  styleUrls: ['./dashboard-saas.component.scss']
})
export class DashboardSaasComponent implements OnInit {

  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  public toastService = inject(ToastService);
  public recordatoriosService = inject(RecordatoriosService);
  private destroyRef = inject(DestroyRef);

  // --- VARIABLES DE ESTADO Y RECORDATORIOS ---
  nuevoRecordatorio: string = '';
  recordatorios: Recordatorio[] = [];

  // --- PROPIEDADES DE ENTRADA Y SALIDA (INPUTS & OUTPUTS) ---
  @Input() empresas: any[] = [];
  @Input() empresasEnMora: number = 0;
  @Input() solicitudesPendientes: number = 0;
  @Input() statsSuscripciones: any = { mrr: 0, clientesActivos: 0, crecimientoMensual: 0 };

  @Output() changeView = new EventEmitter<string>();

  // Bloque del ciclo de vida ngOnInit para inicializar el componente y cargar recordatorios
  ngOnInit() {
    this.cargarRecordatorios();
  }

  // Bloque para consultar la lista de recordatorios activos desde el servicio
  cargarRecordatorios() {
    this.recordatoriosService.getRecordatorios().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.recordatorios = data;
      },
      error: () => {
        this.toastService.error('Error al cargar los recordatorios.');
      }
    });
  }

  // Bloque para registrar un nuevo recordatorio en la base de datos
  agregarRecordatorio() {
    if (!this.nuevoRecordatorio.trim()) return;
    
    this.recordatoriosService.agregarRecordatorio(this.nuevoRecordatorio).subscribe({
      next: (nuevo) => {
        this.recordatorios.unshift(nuevo);
        this.nuevoRecordatorio = '';
        this.toastService.success('Recordatorio añadido exitosamente.');
      },
      error: () => {
        this.toastService.error('Error al guardar el recordatorio.');
      }
    });
  }

  // Bloque para marcar un recordatorio como completado y eliminarlo de la lista activa
  completarRecordatorio(id: number) {
    this.recordatoriosService.eliminarRecordatorio(id).subscribe({
      next: () => {
        this.recordatorios = this.recordatorios.filter(r => r.id !== id);
        this.toastService.success('¡Tarea Completada! Buen trabajo.');
      },
      error: () => {
        this.toastService.error('Error al completar la tarea.');
      }
    });
  }

  // Bloque para emitir el evento de cambio de vista hacia el componente contenedor
  cambiarVista(vista: string) {
    this.changeView.emit(vista);
  }
}
