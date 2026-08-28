import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../services/auth.service';
import { ToastService } from '../../../../../services/toast.service';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './administracion.component.html',
  styleUrl: './administracion.component.scss'
})
export class AdministracionComponent implements OnInit, AfterViewInit {
  private cdr = inject(ChangeDetectorRef);
  @ViewChild('firmaCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  isLoading = true;
  isSubmitting = false;
  migrando = false;
  contratoActivo: any = null;
  userEmpresa: any = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    const esGerente = user?.rol?.nombre === 'Gerente General' || user?.rol?.nombre === 'Gerente';
    if (!esGerente) {
      this.toastService.error('Acceso denegado. Solo el Gerente puede administrar el contrato.');
      
        let ruta = '/inicio';
        if (user && user.empresa) {
            if (user.empresa.dominio) {
                ruta = '/' + user.empresa.dominio + '/inicio';
            } else if (user.empresa.razon_social) {
                const slug = user.empresa.razon_social.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                ruta = '/' + slug + '/inicio';
            }
        }
        this.router.navigate([ruta]);

      return;
    }

    if (user && user.empresa) {
      this.userEmpresa = user.empresa;
    }
    this.cargarContratoActivo();
  }

  ngAfterViewInit(): void {
    if (this.canvasRef) {
      this.initCanvas();
    }
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#0f172a'; // Tono oscuro

    // Eventos Mouse
    canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    canvas.addEventListener('mousemove', this.draw.bind(this));
    canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

    // Eventos Touch
    canvas.addEventListener('touchstart', this.startDrawingTouch.bind(this));
    canvas.addEventListener('touchmove', this.drawTouch.bind(this));
    canvas.addEventListener('touchend', this.stopDrawing.bind(this));
  }

  private getHeaders() {
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`,
        'Accept': 'application/json'
      })
    };
  }

  cargarContratoActivo() {
    this.isLoading = true;
    this.http.get('/api/saas/contratos/activo', this.getHeaders()).subscribe({
      next: (res: any) => {
        this.contratoActivo = res;
        this.isLoading = false;
        
        // El canvas solo se inicializa si el contrato no ha sido firmado
        setTimeout(() => {
          if (this.canvasRef && this.userEmpresa?.contrato_id !== this.contratoActivo.id) {
            this.initCanvas();
          }
        }, 100);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        if (err.name === 'TimeoutError') {
          this.toastService.error('La operación tardó demasiado, intenta nuevamente.');
        }
        if (err.status !== 404) {
          this.toastService.error('No se pudo cargar el contrato.');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Métodos de dibujo en Canvas
  private startDrawing(e: MouseEvent) {
    this.isDrawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(e.offsetX, e.offsetY);
  }

  private draw(e: MouseEvent) {
    if (!this.isDrawing) return;
    this.ctx.lineTo(e.offsetX, e.offsetY);
    this.ctx.stroke();
  }

  private startDrawingTouch(e: TouchEvent) {
    e.preventDefault();
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = e.touches[0];
    this.isDrawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }

  private drawTouch(e: TouchEvent) {
    if (!this.isDrawing) return;
    e.preventDefault();
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = e.touches[0];
    this.ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    this.ctx.stroke();
  }

  private stopDrawing() {
    this.isDrawing = false;
    this.ctx.closePath();
  }

  limpiarFirma() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  firmarContrato() {
    if (!this.contratoActivo) return;

    const canvas = this.canvasRef.nativeElement;
    // Verificar si el canvas está en blanco (de forma rudimentaria chequeando datos de pixeles)
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      this.toastService.warning('Debe dibujar su firma antes de aceptar.');
      return;
    }

    const firmaBase64 = canvas.toDataURL('image/png');
    this.isSubmitting = true;

    const payload = {
      contrato_id: this.contratoActivo.id,
      firma_base64: firmaBase64
    };

    this.http.post('/api/saas/contratos/firmar', payload, this.getHeaders()).pipe(timeout(10000)).subscribe({
      next: (res: any) => {
        this.toastService.success(res.message || 'Contrato firmado con éxito.');
        // Actualizar datos del usuario/empresa localmente
        this.userEmpresa.contrato_id = this.contratoActivo.id;
        this.userEmpresa.fecha_firma = res.fecha_firma;
        this.userEmpresa.firma_gerente_url = firmaBase64;
        
        const currentUser = this.authService.getUser();
        if (currentUser) {
          currentUser.empresa = this.userEmpresa;
          sessionStorage.setItem('current_user', JSON.stringify(currentUser));
        }

        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        if (err.name === 'TimeoutError') {
          this.toastService.error('La operación tardó demasiado, intenta nuevamente.');
        } else {
          this.toastService.error(err.error?.message || 'Error al firmar el contrato.');
        }
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  descargarCopiaContrato() {
    this.toastService.info('Generando copia PDF de su contrato firmado...');
    this.http.get(`/api/empresas/${this.userEmpresa.id}/descargar-contrato`, {
      ...this.getHeaders(),
      responseType: 'blob' as 'json'
    }).subscribe({
      next: (data: any) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Contrato_Servicios_GestivaPyme_${this.userEmpresa.razon_social || this.userEmpresa.nombre_comercial}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.name === 'TimeoutError') {
          this.toastService.error('La operación tardó demasiado, intenta nuevamente.');
        } else {
          this.toastService.error('Hubo un error al generar el PDF del contrato.');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // --- Migración de Datos (Onboarding SaaS) ---
  descargarPlantilla() {
    this.toastService.info('Descargando plantilla de migración...');
    this.http.get('/api/migracion/plantilla', { ...this.getHeaders(), responseType: 'blob' as 'json' }).subscribe({
      next: (data: any) => {
        this.descargarBlob(data, 'Plantilla_Migracion_SaaS.xlsx');
        this.toastService.success('Plantilla descargada.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.name === 'TimeoutError') {
          this.toastService.error('La operación tardó demasiado, intenta nuevamente.');
        } else {
          this.toastService.error('Error al descargar la plantilla.');
        }
        this.cdr.detectChanges();
      }
    });
  }

  descargarBackup() {
    this.toastService.info('Generando respaldo Excel de su negocio...');
    this.http.get('/api/migracion/backup', { ...this.getHeaders(), responseType: 'blob' as 'json' }).subscribe({
      next: (data: any) => {
        this.descargarBlob(data, `Backup_GestivaPyme_Empresa_${this.userEmpresa?.id || ''}.xlsx`);
        this.toastService.success('Respaldo descargado.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.name === 'TimeoutError') {
          this.toastService.error('La operación tardó demasiado, intenta nuevamente.');
        } else {
          this.toastService.error('Error al generar el respaldo.');
        }
        this.cdr.detectChanges();
      }
    });
  }

  onArchivoMigracionSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      this.toastService.error('Formato no válido. Use archivos .xlsx, .xls o .csv.');
      input.value = '';
      return;
    }

    this.migrando = true;
    const formData = new FormData();
    formData.append('archivo', file);

    this.http.post('/api/migracion/subir', formData, this.getHeaders()).pipe(timeout(10000)).subscribe({
      next: (res: any) => {
        this.toastService.success(res.message || 'Archivo subido correctamente.');
        this.migrando = false;
        input.value = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        if (err.name === 'TimeoutError') {
          this.toastService.error('La operación tardó demasiado, intenta nuevamente.');
        } else {
          this.toastService.error(err.error?.message || 'Error al subir el archivo.');
        }
        this.migrando = false;
        input.value = '';
        this.cdr.detectChanges();
      }
    });
  }

  private descargarBlob(data: any, nombreArchivo: string) {
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
