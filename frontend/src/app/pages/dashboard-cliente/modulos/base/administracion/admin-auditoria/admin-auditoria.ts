import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { timeout } from 'rxjs';
import { AuditoriaService } from '../../../../../../services/auditoria.service';
import { ToastService } from '../../../../../../services/toast.service';

@Component({
  selector: 'app-admin-auditoria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-auditoria.html',
  styleUrl: './admin-auditoria.scss'
})
export class AdminAuditoria implements OnInit {
  private auditoriaService = inject(AuditoriaService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  logs: any[] = [];
  isLoading = true;

  ngOnInit() {
    this.cargarLogs();
  }

  cargarLogs() {
    this.isLoading = true;
    this.auditoriaService.getLogs().pipe(timeout(5000)).subscribe({
      next: (data) => {
        // Ordenar del más reciente al más antiguo
        this.logs = data.sort((a, b) => new Date(b.fecha_hora || b.created_at).getTime() - new Date(a.fecha_hora || a.created_at).getTime());
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.name === 'TimeoutError') {
          this.toast.error('La operación tardó demasiado, intenta nuevamente.');
        } else {
          this.toast.error('No se pudieron cargar los registros de auditoría');
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
