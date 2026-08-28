import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
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

  
  public toastService = inject(ToastService);
  public recordatoriosService = inject(RecordatoriosService);

  nuevoRecordatorio: string = '';
  recordatorios: Recordatorio[] = [];

  ngOnInit() {
    this.cargarRecordatorios();
  }

  cargarRecordatorios() {
    this.recordatoriosService.getRecordatorios().subscribe({
      next: (data) => {
        this.recordatorios = data;
      },
      error: () => {
        this.toastService.error('Error al cargar los recordatorios.');
      }
    });
  }

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


  
  @Input() empresas: any[] = [];
  @Input() empresasEnMora: number = 0;
  @Input() solicitudesPendientes: number = 0;
  @Input() statsSuscripciones: any = { mrr: 0, clientesActivos: 0, crecimientoMensual: 0 };

  @Output() changeView = new EventEmitter<string>();

  cambiarVista(vista: string) {
    this.changeView.emit(vista);
  }
}
