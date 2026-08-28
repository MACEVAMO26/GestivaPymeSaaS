import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, timeout } from 'rxjs';
import { SoporteService } from '../../../../../../services/soporte.service';
import { ToastService } from '../../../../../../services/toast.service';
import { LoadingSpinnerComponent } from '../../../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-soporte',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-soporte.html',
  styleUrl: './admin-soporte.scss'
})
export class AdminSoporteComponent implements OnInit {
  private soporteService = inject(SoporteService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  tickets: any[] = [];
  isLoading = true;
  isSaving = false;

  nuevoTicket = {
    asunto: '',
    mensaje: ''
  };

  archivoSeleccionado: File | null = null;

  opcionesAsunto = [
    'Envío comprobante de pago al SaaS',
    'Solicitar soporte técnico general',
    'Solicitar copia de base de datos',
    'Enviar base de datos externa para migración',
    'Solicitar cambio de logo / branding'
  ];

  ngOnInit() {
    this.cargarTickets();
  }

  cargarTickets() {
    this.isLoading = true;
    
    // Obtenemos tanto los tickets de soporte como las solicitudes administrativas
    forkJoin({
      ticketsSoporte: this.soporteService.getTickets(),
      adminRequests: this.soporteService.getAdminRequests()
    }).subscribe({
      next: (res) => {
        // Mapeamos los AdminRequests para que tengan la misma estructura visual que los tickets
        const mapeados = res.adminRequests.map(req => ({
          id: 'AR-' + req.id,
          created_at: req.created_at,
          asunto: this.mapAdminRequestTipoToAsunto(req.tipo),
          mensaje: req.notas_propietaria || 'Solicitud enviada al administrador del SaaS',
          estado: req.estado,
          notas_resolucion: req.notas_propietaria
        }));
        
        // Unimos y ordenamos por fecha
        this.tickets = [...res.ticketsSoporte, ...mapeados].sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        this.isLoading = false;
      },
      error: (err) => {
        this.toast.error('No se pudo cargar el historial de tickets');
        this.isLoading = false;
      }
    });
  }

  mapAdminRequestTipoToAsunto(tipo: string): string {
    switch (tipo) {
      case 'comprobante_pago': return 'Envío comprobante de pago al SaaS';
      case 'solicitud_bd': return 'Solicitar copia de base de datos';
      case 'migracion_bd': return 'Enviar base de datos externa para migración';
      case 'cambio_logo': return 'Solicitar cambio de logo / branding';
      default: return 'Solicitud administrativa (' + tipo + ')';
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
    }
  }

  get requireFile(): boolean {
    return this.nuevoTicket.asunto === 'Envío comprobante de pago al SaaS' ||
           this.nuevoTicket.asunto === 'Enviar base de datos externa para migración' ||
           this.nuevoTicket.asunto === 'Solicitar cambio de logo / branding';
  }

  get fileAcceptType(): string {
    if (this.nuevoTicket.asunto === 'Envío comprobante de pago al SaaS') return '.pdf,.jpg,.jpeg,.png';
    if (this.nuevoTicket.asunto === 'Enviar base de datos externa para migración') return '.sql,.zip';
    if (this.nuevoTicket.asunto === 'Solicitar cambio de logo / branding') return '.jpg,.jpeg,.png';
    return '*/*';
  }

  enviarTicket() {
    if (!this.nuevoTicket.asunto || !this.nuevoTicket.mensaje) {
      this.toast.warning('Por favor selecciona un asunto y describe tu solicitud.');
      return;
    }

    if (this.requireFile && !this.archivoSeleccionado) {
      this.toast.warning('Este tipo de solicitud requiere que adjuntes un archivo.');
      return;
    }

    this.isSaving = true;

    if (this.nuevoTicket.asunto === 'Solicitar soporte técnico general') {
      // Envío como ticket de soporte estándar
      this.soporteService.createTicket(this.nuevoTicket).pipe(timeout(10000)).subscribe({
        next: (res) => {
          this.toast.success('Ticket enviado correctamente. Te contactaremos pronto.');
          this.isSaving = false;
          this.nuevoTicket = { asunto: '', mensaje: '' };
          this.archivoSeleccionado = null;
          this.cargarTickets();
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err.name === 'TimeoutError') {
             this.toast.error('Tiempo de espera agotado. La solicitud se envió en segundo plano.');
          } else {
             this.toast.error('La solicitud fue enviada pero el servidor tardó en responder. Verifica el historial.');
          }
          this.isSaving = false;
          this.cargarTickets();
          this.cdr.detectChanges();
        }
      });
    } else {
      // Envío como AdminRequest
      const formData = new FormData();
      formData.append('datos_nuevos', JSON.stringify({ mensaje: this.nuevoTicket.mensaje }));
      
      switch (this.nuevoTicket.asunto) {
        case 'Envío comprobante de pago al SaaS':
          formData.append('tipo', 'comprobante_pago');
          if (this.archivoSeleccionado) formData.append('comprobante', this.archivoSeleccionado);
          break;
        case 'Solicitar copia de base de datos':
          formData.append('tipo', 'solicitud_bd');
          break;
        case 'Enviar base de datos externa para migración':
          formData.append('tipo', 'migracion_bd');
          if (this.archivoSeleccionado) formData.append('documento', this.archivoSeleccionado);
          break;
        case 'Solicitar cambio de logo / branding':
          formData.append('tipo', 'cambio_logo');
          if (this.archivoSeleccionado) formData.append('logo', this.archivoSeleccionado);
          break;
      }

      this.soporteService.createAdminRequest(formData).pipe(timeout(10000)).subscribe({
        next: (res) => {
          this.toast.success('Solicitud enviada al administrador.');
          this.isSaving = false;
          this.nuevoTicket = { asunto: '', mensaje: '' };
          this.archivoSeleccionado = null;
          // Limpiar input de archivo
          const fileInput = document.getElementById('archivoRequerido') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          this.cargarTickets();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          if (err.name === 'TimeoutError') {
             this.toast.error('Tiempo de espera agotado. La solicitud se envió en segundo plano.');
          } else {
             this.toast.error('Ocurrió un error al enviar la solicitud.');
          }
          this.cdr.detectChanges();
        }
      });
    }
  }

  // Helpers visuales
  getEstadoBadgeClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'abierto': return 'badge-pendiente';
      case 'en progreso': return 'badge-info';
      case 'pendiente': return 'badge-pendiente'; // Para admin_requests
      case 'aprobado': return 'badge-activo'; // Para admin_requests
      case 'rechazado': return 'badge-baja'; // Para admin_requests
      case 'resuelto': return 'badge-activo';
      case 'cerrado': return 'badge-baja';
      default: return 'badge-pendiente';
    }
  }
}
