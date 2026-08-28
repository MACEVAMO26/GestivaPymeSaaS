import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner';
import { ToastService } from '../../../../../services/toast.service';

interface Directriz {
  id: number;
  mensaje: string;
  audiencia: string;
  activo: boolean;
  created_at?: string;
}

@Component({
  selector: 'app-gestiva-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './gestiva-ia.component.html',
  styleUrl: './gestiva-ia.component.scss'
})
export class GestivaIaComponent implements OnInit {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  cargando = false;
  guardando = false;
  directrices: Directriz[] = [];

  showForm = false;
  modoEdicion = false;
  
  form: Partial<Directriz> = {
    mensaje: '',
    audiencia: 'Todos',
    activo: true
  };

  ngOnInit() {
    // Retraso de 500ms para evitar que la petición concurrente con el Asistente IA 
    // bloquee el servidor local de PHP (php artisan serve) en Windows.
    setTimeout(() => {
      this.cargarDirectrices();
    }, 500);
  }

  cargarDirectrices() {
    this.cargando = true;
    this.http.get<Directriz[]>('/api/ia/directrices').subscribe({
      next: (res) => {
        this.directrices = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar directrices', err);
        this.cargando = false;
        this.cdr.detectChanges();
        this.toastService.error('Error al cargar directrices.');
      }
    });
  }

  abrirFormulario(directriz?: Directriz) {
    this.showForm = true;
    if (directriz) {
      this.modoEdicion = true;
      this.form = { ...directriz };
    } else {
      this.modoEdicion = false;
      this.form = {
        mensaje: '',
        audiencia: 'Todos',
        activo: true
      };
    }
  }

  cerrarFormulario() {
    this.showForm = false;
    this.form = {};
  }

  guardarDirectriz() {
    if (!this.form.mensaje || !this.form.audiencia) {
      this.toastService.warning('Por favor completa los campos requeridos.');
      return;
    }

    this.guardando = true;
    
    if (this.modoEdicion && this.form.id) {
      this.http.put(`/api/ia/directrices/${this.form.id}`, this.form).subscribe({
        next: () => {
          this.guardando = false;
          this.cerrarFormulario();
          this.cargarDirectrices();
          this.toastService.success('Directriz actualizada con éxito');
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.guardando = false;
          this.cdr.detectChanges();
          this.toastService.error('Error al actualizar');
        }
      });
    } else {
      this.http.post('/api/ia/directrices', this.form).subscribe({
        next: () => {
          this.guardando = false;
          this.cerrarFormulario();
          this.cargarDirectrices();
          this.toastService.success('Directriz creada con éxito');
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.guardando = false;
          this.cdr.detectChanges();
          this.toastService.error('Error al crear');
        }
      });
    }
  }

  toggleActivo(directriz: Directriz) {
    directriz.activo = !directriz.activo;
    this.http.put(`/api/ia/directrices/${directriz.id}`, { activo: directriz.activo }).subscribe({
      error: (err) => {
        console.error(err);
        directriz.activo = !directriz.activo; // revertir
        this.toastService.error('Error al cambiar estado');
      }
    });
  }

  eliminarDirectriz(id: number) {
    if (confirm('¿Estás seguro de eliminar esta directriz?')) {
      this.http.delete(`/api/ia/directrices/${id}`).subscribe({
        next: () => {
          this.cargarDirectrices();
          this.toastService.success('Directriz eliminada');
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Error al eliminar');
        }
      });
    }
  }
}
