import { Component, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AccessibilityService, DaltonismMode } from '../../../services/accessibility/accessibility.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {

  // --- VARIABLES DE ESTADO ---
  credentials = {
    email: '',
    password: ''
  };
  isLoading = false;
  suspendedMessage = '';
  showPassword = false;
  isAccessibilityMenuOpen = false;
  requiresPasswordChange = false;
  changePasswordData = {
    newPassword: ''
  };

  // Control de Sesiones Simultáneas
  showSessionConflictModal = false;
  sessionConflictMessage = '';
  remoteLogoutNotice = '';

  // Modal Recuperar Contraseña
  showRecoveryModal = false;
  recoveryEmail = '';
  isRecovering = false;
  recoveryMessage = '';
  recoveryError = '';

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public accessibilityService = inject(AccessibilityService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    // Si el usuario llega al login (por botón atrás o navegación directa) teniendo sesión abierta, se cierra de inmediato
    if (this.authService.getToken()) {
      this.authService.logout(false);
    }

    // Si viene redirigido porque se inició sesión en otro dispositivo
    this.route.queryParams.subscribe(params => {
      if (params['motivo'] === 'sesion_remota') {
        this.remoteLogoutNotice = 'Tu sesión fue cerrada porque se inició sesión con tu cuenta desde otro dispositivo o navegador.';
        this.cdr.detectChanges();
      }
    });
  }

  abrirModalRecuperar() {
    this.recoveryEmail = this.credentials.email || '';
    this.recoveryMessage = '';
    this.recoveryError = '';
    this.showRecoveryModal = true;
  }

  cerrarModalRecuperar() {
    this.showRecoveryModal = false;
    this.recoveryEmail = '';
    this.recoveryMessage = '';
    this.recoveryError = '';
  }

  solicitarRecuperacion() {
    if (!this.recoveryEmail || !this.recoveryEmail.trim()) {
      this.recoveryError = 'Ingrese su correo electrónico registrado.';
      return;
    }

    this.isRecovering = true;
    this.recoveryError = '';
    this.recoveryMessage = '';

    this.authService.recuperarPassword(this.recoveryEmail.trim()).subscribe({
      next: (res) => {
        this.isRecovering = false;
        this.recoveryMessage = res.message || 'Contraseña restablecida a usuario12369.';
        this.credentials.email = this.recoveryEmail;
        this.credentials.password = 'usuario12369';
        this.cdr.detectChanges();
      },
      error: () => {
        this.isRecovering = false;
        this.recoveryError = 'Error al procesar la solicitud. Verifique el correo electrónico e intente de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  // Alterna la visibilidad de la contraseña en el formulario
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Abre o cierra el menú de opciones de accesibilidad
  toggleAccessibilityMenu() {
    this.isAccessibilityMenuOpen = !this.isAccessibilityMenuOpen;
  }

  // Aplica el filtro de daltonismo seleccionado
  setDaltonismMode(mode: DaltonismMode) {
    this.accessibilityService.setMode(mode);
    this.isAccessibilityMenuOpen = false;
  }

  // Cierra el modal de advertencia de sesión simultánea
  cancelarConflictoSesion(): void {
    this.showSessionConflictModal = false;
    this.sessionConflictMessage = '';
  }

  // Cierra la sesión activa en el otro dispositivo e ingresa en este
  cerrarOtraSesionEIngresar(): void {
    this.onSubmit(true);
  }

  // Procesa el formulario de login y redirige según el rol
  onSubmit(forceLogout: boolean = false): void {
    if (this.requiresPasswordChange) {
      this.submitNewPassword();
      return;
    }

    this.isLoading = true;
    const payload = {
      ...this.credentials,
      force_logout: forceLogout
    };

    this.authService.login(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.showSessionConflictModal = false;
        this.remoteLogoutNotice = '';
        console.log("LOGIN RESPONSE", response);

        // Si el backend exige cambio de clave, mostramos el formulario de cambio
        if (response.requires_password_change) {
          this.requiresPasswordChange = true;
          this.cdr.detectChanges();
          return;
        }

        const user = response.user;
        if (user && user.empresa_id === null) {
          console.log("NAVIGATING TO /saas-admin/dashboard");
          this.router.navigate(['/saas-admin', 'dashboard']);
        } else {
          let ruta = '/inicio';
          if (user.empresa && user.empresa.dominio) {
            ruta = '/' + user.empresa.dominio + '/inicio';
          } else if (user.empresa && user.empresa.razon_social) {
            const slug = user.empresa.razon_social.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, '');
            ruta = '/' + slug + '/inicio';
          }
          console.log("NAVIGATING TO", ruta);
          this.router.navigateByUrl(ruta);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error("LOGIN ERROR", err);

        let errorData = err.error;
        if (typeof errorData === 'string') {
          try {
            errorData = JSON.parse(errorData);
          } catch {
            // No es un string JSON válido
          }
        }

        // 1. Conflicto por Sesión Simultánea abierta en otro dispositivo
        if (err.status === 409 || errorData?.session_conflict) {
          this.sessionConflictMessage = errorData?.message || 'Ya existe una sesión activa para este usuario en otro dispositivo o navegador. Por seguridad, no se permiten sesiones simultáneas.';
          this.showSessionConflictModal = true;
          this.cdr.detectChanges();
          return;
        }

        if (errorData && errorData.errors) {
          const errors = errorData.errors;
          if (errors.system_suspended) {
            this.suspendedMessage = errors.system_suspended[0];
            this.cdr.detectChanges();
            return;
          }
          if (errors.email) {
            alert(errors.email[0]);
            return;
          }
        }

        if (errorData?.message) {
          alert(errorData.message);
          return;
        }

        alert('Credenciales incorrectas o error en el servidor. Revisa la consola.');
      }
    });
  }

  // Envía la nueva contraseña para forzar el cambio inicial
  submitNewPassword(): void {
    this.isLoading = true;
    const payload = {
      email: this.credentials.email,
      current_password: this.credentials.password,
      new_password: this.changePasswordData.newPassword
    };

    this.authService.changeInitialPassword(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        alert(response.message);
        window.location.reload();
      },
      error: (err) => {
        this.isLoading = false;
        if (err.error && err.error.errors) {
          const firstError = Object.values(err.error.errors)[0] as string[];
          alert(firstError[0]);
        } else {
          alert('Ocurrió un error al cambiar la contraseña. Asegúrate de cumplir con los requisitos.');
        }
      }
    });
  }
}
