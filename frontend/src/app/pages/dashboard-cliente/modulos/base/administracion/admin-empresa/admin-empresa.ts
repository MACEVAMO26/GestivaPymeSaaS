import { VolverDirective } from '../../../../../../shared/directives/volver.directive';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingSpinnerComponent } from '../../../../../../shared/components/loading-spinner/loading-spinner';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs';
import { EmpresaService } from '../../../../../../services/empresa.service';
import { AuthService } from '../../../../../../services/auth.service';
import { SoporteService } from '../../../../../../services/soporte.service';
import { ToastService } from '../../../../../../services/toast.service';

@Component({
  selector: 'app-admin-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent, VolverDirective],
  templateUrl: './admin-empresa.html',
  styleUrl: './admin-empresa.scss',
})
export class AdminEmpresa implements OnInit {
  // --- INYECCION DE DEPENDENCIAS Y SERVICIOS ---
  private empresaService = inject(EmpresaService);
  private authService = inject(AuthService);
  private soporteService = inject(SoporteService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  // --- VARIABLES DE ESTADO Y FORMULARIO ---
  empresaData: any = {
    nombre: '',
    nit: '',
    direccion: '',
    telefono: '',
    email_contacto: '',
    color_primario: '#45a1ae',
    logo_url: ''
  };

  isLoading = true;
  isSaving = false;
  logoSeleccionado: File | null = null;
  logoPreview: string | null = null;
  toasts: any[] = [];

  // Bloque de ciclo de vida para inicializar y cargar la empresa
  ngOnInit(): void {
    this.cargarEmpresa();
  }

  // Bloque para cargar la informacion de la empresa actual
  cargarEmpresa() {
    this.isLoading = true;
    const currentUser = this.authService.getUser();
    if (currentUser && currentUser.empresa_id) {
      this.empresaService.getEmpresa(currentUser.empresa_id).subscribe({
        next: (data) => {
          this.empresaData = data || {};
          this.empresaData.nombre = data?.razon_social || '';
          this.empresaData.nit = data?.nit || '';
          this.empresaData.direccion = data?.direccion || '';
          this.empresaData.telefono = data?.telefono || '';
          this.empresaData.tipo_empresa = data?.tipo_empresa || 'Servicios';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[AdminEmpresa] Error al cargar empresa:', err);
          this.mostrarToast('Error al cargar datos', 'error', 'No se pudo conectar con el servidor.');
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.isLoading = false;
    }
  }

  // Bloque para capturar el logo seleccionado y generar previsualizacion
  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.logoSeleccionado = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  // Bloque para guardar los cambios de la empresa o enviar solicitud de logo
  guardarCambios() {
    if (!this.empresaData.nombre || !this.empresaData.nit) {
      this.mostrarToast('Campos Incompletos', 'warning', 'Por favor llena los campos obligatorios.');
      return;
    }

    this.isSaving = true;
    const currentUser = this.authService.getUser();

    if (this.logoSeleccionado) {
      const formData = new FormData();
      formData.append('tipo', 'cambio_datos');
      formData.append('logo', this.logoSeleccionado);
      formData.append('datos_nuevos', JSON.stringify({
        razon_social: this.empresaData.nombre,
        nit: this.empresaData.nit,
        direccion: this.empresaData.direccion || '',
        telefono: this.empresaData.telefono || ''
      }));

      this.soporteService.createAdminRequest(formData).pipe(timeout(10000)).subscribe({
        next: (res) => {
          this.isSaving = false;
          this.logoSeleccionado = null;
          this.logoPreview = null;
          this.mostrarToast('Solicitud enviada', 'success', 'El nuevo logo se envió para aprobación del administrador del SaaS.');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          console.error('[AdminEmpresa] Error al enviar solicitud de logo:', err);
          if (err.name === 'TimeoutError') {
            this.mostrarToast('Tiempo de espera agotado', 'error', 'El servidor tardó demasiado en responder.');
          } else {
            this.mostrarToast('Error', 'error', 'Hubo un problema al enviar la solicitud del logo.');
          }
          this.cdr.detectChanges();
        }
      });
      return;
    }

    const payload = {
      ...this.empresaData,
      razon_social: this.empresaData.nombre,
      tipo_empresa: this.empresaData.tipo_empresa || 'Servicios'
    };
    
    this.empresaService.updateEmpresa(currentUser.empresa_id, payload).pipe(timeout(10000)).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.mostrarToast('Actualizado', 'success', 'Los datos de la empresa se guardaron correctamente.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        if (err.name === 'TimeoutError') {
          this.mostrarToast('Tiempo de espera agotado', 'error', 'El servidor tardó demasiado en responder.');
        } else {
          this.mostrarToast('Error', 'error', 'Hubo un problema al guardar los cambios.');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para mostrar notificaciones toast en interfaz neumorfica
  mostrarToast(titulo: string, tipo: 'success'|'error'|'warning'|'info', descripcion?: string) {
    const nuevoToast = { id: Date.now(), titulo, tipo, descripcion };
    this.toasts.unshift(nuevoToast);
    this.toastService.show(descripcion ? `${titulo}: ${descripcion}` : titulo, tipo);

    setTimeout(() => {
      this.cerrarToast(nuevoToast.id);
    }, 4000);
  }

  // Bloque para cerrar una notificacion toast especifica
  cerrarToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}
