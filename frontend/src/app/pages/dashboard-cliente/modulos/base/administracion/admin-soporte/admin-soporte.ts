import { VolverDirective } from '../../../../../../shared/directives/volver.directive';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs';
import { SoporteService } from '../../../../../../services/soporte.service';
import { ToastService } from '../../../../../../services/toast.service';
import { LoadingSpinnerComponent } from '../../../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-soporte',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent, VolverDirective],
  templateUrl: './admin-soporte.html',
  styleUrl: './admin-soporte.scss'
})
export class AdminSoporteComponent implements OnInit {
  // --- INYECCION DE DEPENDENCIAS Y SERVICIOS ---
  private soporteService = inject(SoporteService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  // --- VARIABLES DE ESTADO Y FORMULARIO ---
  tickets: any[] = [];
  isLoading = true;
  isSaving = false;

  pageSize = 8;
  pageTickets = 1;
  filtroTexto: string = '';
  filtroFecha: string = '';
  filtroEstado: string = '';

  // Bloque para obtener los tickets filtrados
  get ticketsFiltrados(): any[] {
    return this.tickets.filter((t: any) => {
      if (this.filtroTexto.trim()) {
        const query = this.filtroTexto.toLowerCase().trim();
        const asunto = (t.asunto || '').toLowerCase();
        const mensaje = (t.mensaje || '').toLowerCase();
        const tipo = (t.tipo || '').toLowerCase();
        if (!asunto.includes(query) && !mensaje.includes(query) && !tipo.includes(query)) {
          return false;
        }
      }

      if (this.filtroEstado) {
        if ((t.estado || '').toLowerCase() !== this.filtroEstado.toLowerCase()) {
          return false;
        }
      }

      if (this.filtroFecha) {
        const fecha = (t.created_at || t.fecha_creacion || '').substring(0, 10);
        if (fecha !== this.filtroFecha) {
          return false;
        }
      }

      return true;
    });
  }

  // Bloque para obtener los tickets paginados
  get paginatedTickets(): any[] {
    const start = (this.pageTickets - 1) * this.pageSize;
    return this.ticketsFiltrados.slice(start, start + this.pageSize);
  }

  // Bloque para calcular el total de páginas de tickets
  get totalPagesTickets(): number {
    return Math.ceil(this.ticketsFiltrados.length / this.pageSize) || 1;
  }

  // Bloque para resetear la paginación al cambiar filtros
  onFiltroChange() {
    this.pageTickets = 1;
  }

  // Bloque para limpiar los filtros del historial de tickets
  limpiarFiltros() {
    this.filtroTexto = '';
    this.filtroFecha = '';
    this.filtroEstado = '';
    this.pageTickets = 1;
  }

  nuevoTicket = {
    asunto: '',
    mensaje: ''
  };

  selectedFile: File | null = null;

  opcionesAsunto: string[] = [
    'Actualización de Logotipo Empresarial',
    'Actualización de Razón Social / NIT',
    'Reporte de Error Técnico en el Sistema',
    'Solicitud de Cancelación de Contrato',
    'Otros Asuntos Administrativos'
  ];

  get requireFile(): boolean {
    return this.nuevoTicket.asunto === 'Actualización de Logotipo Empresarial';
  }

  get fileAcceptType(): string {
    if (this.nuevoTicket.asunto === 'Actualización de Logotipo Empresarial') {
      return '.jpg,.jpeg,.png';
    }
    return '.pdf,.jpg,.jpeg,.png';
  }

  // Bloque de ciclo de vida para inicializar y cargar los tickets
  ngOnInit() {
    this.cargarTickets();
  }

  // Bloque para cargar el historial de tickets de soporte
  cargarTickets() {
    this.isLoading = true;
    this.soporteService.getTickets().pipe(timeout(5000)).subscribe({
      next: (data) => {
        const misTickets = (data || []).map((t: any) => ({
          ...t,
          asunto: this.mapAdminRequestTipoToAsunto(t.asunto || t.tipo),
          fecha_creacion: t.fecha_creacion || t.created_at
        }));
        this.tickets = misTickets;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.name === 'TimeoutError') {
          this.toast.error('La operación tardó demasiado, intenta nuevamente.');
        } else {
          this.toast.error('No se pudo cargar el historial de tickets');
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para mapear tipo tecnico a asunto legible
  mapAdminRequestTipoToAsunto(tipo: string): string {
    switch (tipo) {
      case 'cancelacion_cuenta': return 'Solicitud de Cancelación de Contrato';
      case 'soporte': return 'Reporte de Error Técnico en el Sistema';
      case 'cambio_datos': return 'Actualización de Razón Social / NIT / Logo';
      default: return tipo || 'Solicitud de Soporte';
    }
  }

  // Bloque para manejar la seleccion de archivo adjunto
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  // Bloque para enviar el ticket de soporte o solicitud administrativa
  enviarTicket() {
    if (!this.nuevoTicket.asunto || !this.nuevoTicket.mensaje) {
      this.toast.warning('Por favor completa todos los campos');
      return;
    }

    if (this.requireFile && !this.selectedFile) {
      this.toast.warning('Debes adjuntar el archivo correspondiente para esta solicitud');
      return;
    }

    this.isSaving = true;

    if (this.nuevoTicket.asunto === 'Actualización de Logotipo Empresarial') {
      const formData = new FormData();
      formData.append('tipo', 'cambio_datos');
      formData.append('mensaje', this.nuevoTicket.mensaje);
      if (this.selectedFile) {
        formData.append('logo', this.selectedFile);
      }

      this.soporteService.createAdminRequest(formData).pipe(timeout(10000)).subscribe({
        next: (res) => {
          this.toast.success('Solicitud de cambio de logo enviada con éxito');
          this.nuevoTicket = { asunto: '', mensaje: '' };
          this.selectedFile = null;
          const fileInput = document.getElementById('archivoRequerido') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          this.isSaving = false;
          this.cargarTickets();
        },
        error: (err) => {
          this.isSaving = false;
          if (err.name === 'TimeoutError') {
            this.toast.error('La operación tardó demasiado, intenta nuevamente.');
          } else {
            this.toast.error('Error al enviar la solicitud');
          }
          this.cdr.detectChanges();
        }
      });
      return;
    }

    if (this.nuevoTicket.asunto === 'Solicitud de Cancelación de Contrato') {
      const formData = new FormData();
      formData.append('tipo', 'cancelacion_cuenta');
      formData.append('mensaje', this.nuevoTicket.mensaje);
      if (this.selectedFile) {
        formData.append('soporte_file', this.selectedFile);
      }

      this.soporteService.createAdminRequest(formData).pipe(timeout(10000)).subscribe({
        next: (res) => {
          this.toast.success('Solicitud de cancelación enviada formalmente');
          this.nuevoTicket = { asunto: '', mensaje: '' };
          this.selectedFile = null;
          const fileInput = document.getElementById('archivoRequerido') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          this.isSaving = false;
          this.cargarTickets();
        },
        error: (err) => {
          this.isSaving = false;
          if (err.name === 'TimeoutError') {
            this.toast.error('La operación tardó demasiado, intenta nuevamente.');
          } else {
            this.toast.error('Error al enviar la solicitud');
          }
          this.cdr.detectChanges();
        }
      });
      return;
    }

    const payload = {
      asunto: this.nuevoTicket.asunto,
      mensaje: this.nuevoTicket.mensaje
    };

    this.soporteService.createTicket(payload).pipe(timeout(10000)).subscribe({
      next: (res: any) => {
        this.toast.success('Ticket enviado al equipo de soporte');
        this.nuevoTicket = { asunto: '', mensaje: '' };
        this.selectedFile = null;
        this.isSaving = false;
        this.cargarTickets();
      },
      error: (err: any) => {
        this.isSaving = false;
        if (err.name === 'TimeoutError') {
          this.toast.error('La operación tardó demasiado, intenta nuevamente.');
        } else {
          this.toast.error('Error al enviar el ticket');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para obtener la clase CSS del badge de estado del ticket
  getEstadoBadgeClass(estado: string): string {
    const est = (estado || '').toLowerCase();
    if (est === 'abierto' || est === 'pendiente') return 'badge-abierto';
    if (est === 'en proceso') return 'badge-proceso';
    if (est === 'resuelto' || est === 'cerrado' || est === 'aprobada' || est === 'aprobado') return 'badge-cerrado';
    return 'badge-abierto';
  }
}
