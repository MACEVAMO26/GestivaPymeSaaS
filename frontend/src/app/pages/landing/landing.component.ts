import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  // --- VARIABLES DE ESTADO ---
  isChatbotOpen = false;
  botView: 'menu' | 'phone' | 'form' | 'success' = 'menu';
  isSubmitting = false;
  errorMessage = '';
  leadForm = {
    nombre: '',
    telefono: '',
    correo: '',
    horario_llamada: '',
    mensaje: ''
  };

  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  goToLogin() {
    this.router.navigate(['/login']);
  }

  // Inicializa el componente y despierta al servidor
  ngOnInit(): void {
    // Configurar SEO dinámico
    this.titleService.setTitle('GestivaPyme | Software de Gestión, Facturación y ERP para Pymes');
    this.metaService.updateTag({
      name: 'description',
      content: 'GestivaPyme es el software ERP y administrativo en la nube para pymes y emprendedores. Controla inventario, clientes 360, cotizaciones, ventas, compras, servicios técnicos FSM y finanzas.'
    });

    // Ping "Ninja" para despertar a Render de su inactividad gratuita
    this.http.get('/api/ping').subscribe({
      next: () => console.log('Servidor despertado'),
      error: () => console.log('Error despertando servidor')
    });
  }

  // Alterna la visibilidad del chatbot
  toggleChatbot() {
    this.isChatbotOpen = !this.isChatbotOpen;
    if (!this.isChatbotOpen) {
      this.botView = 'menu';
      this.errorMessage = '';
    }
  }

  // Muestra la vista de contacto telefonico
  showPhone() {
    this.botView = 'phone';
  }

  // Muestra la vista de formulario de contacto
  showForm() {
    this.botView = 'form';
  }

  // Vuelve al menu principal del chatbot
  backToMenu() {
    this.botView = 'menu';
    this.errorMessage = '';
  }

  // Envia el formulario para registro de lead
  submitLead() {
    this.errorMessage = '';
    if (!this.leadForm.nombre || !this.leadForm.telefono || !this.leadForm.correo || !this.leadForm.horario_llamada) {
      this.errorMessage = 'Por favor completa nombre, teléfono, correo y horario.';
      return;
    }

    this.isSubmitting = true;

    this.http.post('/api/leads', this.leadForm)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.botView = 'success';
          
          // Restablece el formulario a sus valores iniciales
          this.leadForm = {
            nombre: '',
            telefono: '',
            correo: '',
            horario_llamada: '',
            mensaje: ''
          };
          this.cdr.detectChanges();

          // Cierra automáticamente el mensaje de éxito después de 3 segundos
          setTimeout(() => {
            if (this.botView === 'success') {
              this.backToMenu();
              this.cdr.detectChanges();
            }
          }, 3000);
        },
        error: (err) => {
          console.error('Error enviando lead:', err);
          this.errorMessage = 'Hubo un error de conexión con el servidor. Intenta nuevamente.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
  }
}
