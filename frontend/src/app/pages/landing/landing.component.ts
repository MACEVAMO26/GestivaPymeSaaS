import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';

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
  isMobileMenuOpen = false;
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

  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private authService = inject(AuthService);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  // Bloque para redirigir a la vista de inicio de sesión cerrando el menú móvil
  goToLogin() {
    this.isMobileMenuOpen = false;
    this.router.navigate(['/login']);
  }

  // Bloque para alternar la visibilidad del menú desplegable en pantallas móviles
  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  // Bloque para cerrar el menú móvil al seleccionar una opción de navegación
  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  // Bloque del ciclo de vida ngOnInit para inicializar el componente, verificar sesión activa y configurar SEO
  ngOnInit(): void {
    // Bloque de cierre de sesión previa en caso de que exista un token activo al ingresar al landing
    if (this.authService.getToken()) {
      this.authService.logout(false);
    }

    window.scrollTo(0, 0);

    // Bloque para configurar el SEO dinámico y metadatos de la página
    this.titleService.setTitle('GestivaPyme | Software de Gestión, Facturación y ERP para Pymes');
    this.metaService.updateTag({
      name: 'description',
      content: 'GestivaPyme es el software ERP y administrativo en la nube para pymes y emprendedores. Controla inventario, clientes 360, cotizaciones, ventas, compras, servicios técnicos FSM y finanzas.'
    });

    // Bloque de ping ninja para reactivar el servicio del backend en caso de inactividad
    this.http.get('/api/ping').subscribe({
      next: () => console.log('Servidor despertado'),
      error: () => console.log('Error despertando servidor')
    });
  }

  // Bloque para alternar la visibilidad de la ventana del chatbot
  toggleChatbot() {
    this.isChatbotOpen = !this.isChatbotOpen;
    if (!this.isChatbotOpen) {
      this.botView = 'menu';
      this.errorMessage = '';
    }
  }

  // Bloque para mostrar la vista de contacto telefónico en el bot
  showPhone() {
    this.botView = 'phone';
  }

  // Bloque para mostrar la vista de formulario de contacto en el bot
  showForm() {
    this.botView = 'form';
  }

  // Bloque para regresar al menú principal del chatbot
  backToMenu() {
    this.botView = 'menu';
    this.errorMessage = '';
  }

  // Bloque para validar y enviar el formulario de registro de prospecto (lead) al backend
  submitLead() {
    this.errorMessage = '';

    // Bloque de validación de campos requeridos del formulario
    if (!this.leadForm.nombre || !this.leadForm.telefono || !this.leadForm.correo || !this.leadForm.horario_llamada) {
      this.errorMessage = 'Por favor completa nombre, teléfono, correo y horario.';
      return;
    }

    this.isSubmitting = true;

    // Bloque de petición HTTP POST para registrar el prospecto en la base de datos
    this.http.post('/api/leads', this.leadForm)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.botView = 'success';
          
          // Bloque de reinicio del formulario tras envío exitoso
          this.leadForm = {
            nombre: '',
            telefono: '',
            correo: '',
            horario_llamada: '',
            mensaje: ''
          };
          this.cdr.detectChanges();

          // Bloque de temporizador para retornar al menú principal automáticamente tras 3 segundos
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
