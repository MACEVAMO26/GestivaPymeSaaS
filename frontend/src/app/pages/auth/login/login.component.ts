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

  // --- CONTROL DE SESIONES SIMULTÁNEAS ---
  showSessionConflictModal = false;
  sessionConflictMessage = '';
  remoteLogoutNotice = '';

  // --- MODAL RECUPERAR CONTRASEÑA ---
  showRecoveryModal = false;
  recoveryEmail = '';
  isRecovering = false;
  recoveryMessage = '';
  recoveryError = '';

  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public accessibilityService = inject(AccessibilityService);
  private cdr = inject(ChangeDetectorRef);

  // Bloque del ciclo de vida ngOnInit para inicializar el login, verificar sesión previa y capturar motivos de redirección
  ngOnInit(): void {
    // Bloque de cierre de sesión si el usuario llega al login teniendo un token previo activo
    if (this.authService.getToken()) {
      this.authService.logout(false);
    }

    // Bloque de detección de parámetros URL por desconexión remota o por inactividad
    this.route.queryParams.subscribe(params => {
      if (params['motivo'] === 'sesion_remota') {
        this.remoteLogoutNotice = 'Tu sesión fue cerrada porque se inició sesión con tu cuenta desde otro dispositivo o navegador.';
      } else if (params['motivo'] === 'inactividad') {
        this.remoteLogoutNotice = 'Tu sesión fue cerrada automáticamente tras 1 hora de inactividad.';
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para abrir el modal de recuperación de contraseña
  abrirModalRecuperar() {
    this.recoveryEmail = this.credentials.email || '';
    this.recoveryMessage = '';
    this.recoveryError = '';
    this.showRecoveryModal = true;
  }

  // Bloque para cerrar el modal de recuperación de contraseña y limpiar el formulario
  cerrarModalRecuperar() {
    this.showRecoveryModal = false;
    this.recoveryEmail = '';
    this.recoveryMessage = '';
    this.recoveryError = '';
  }

  // Bloque para solicitar el restablecimiento de contraseña temporal al backend
  solicitarRecuperacion() {
    if (!this.recoveryEmail || !this.recoveryEmail.trim()) {
      this.recoveryError = 'Ingrese su correo electrónico registrado.';
      return;
    }

    this.isRecovering = true;
    this.recoveryError = '';
    this.recoveryMessage = '';

    // Bloque de petición HTTP para procesar la recuperación de contraseña
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

  // Bloque para alternar la visibilidad de la contraseña en el formulario
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Bloque para alternar la visibilidad del menú de accesibilidad visual
  toggleAccessibilityMenu() {
    this.isAccessibilityMenuOpen = !this.isAccessibilityMenuOpen;
  }

  // Bloque para aplicar el filtro de daltonismo seleccionado mediante el servicio de accesibilidad
  setDaltonismMode(mode: DaltonismMode) {
    this.accessibilityService.setMode(mode);
    this.isAccessibilityMenuOpen = false;
  }

  // Bloque para cancelar el modal de conflicto de sesión simultánea
  cancelarConflictoSesion(): void {
    this.showSessionConflictModal = false;
    this.sessionConflictMessage = '';
  }

  // Bloque para forzar el cierre de la sesión remota previa e iniciar sesión en el dispositivo actual
  cerrarOtraSesionEIngresar(): void {
    this.onSubmit(true);
  }

  // Bloque para procesar el formulario de inicio de sesión y redirigir según el rol y empresa
  onSubmit(forceLogout: boolean = false): void {
    if (this.requiresPasswordChange) {
      this.submitNewPassword();
      return;
    }

    this.isLoading = true;
    const payload = {
      ...this.credentials,
      email: (this.credentials.email || '').trim().toLowerCase(),
      force_logout: forceLogout
    };

    // Bloque de autenticación contra la API Sanctum
    this.authService.login(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.showSessionConflictModal = false;
        this.remoteLogoutNotice = '';
        console.log("LOGIN RESPONSE", response);

        // Bloque de verificación si se requiere cambio de clave obligatorio
        if (response.requires_password_change) {
          this.requiresPasswordChange = true;
          this.cdr.detectChanges();
          return;
        }

        // Bloque de enrutamiento según rol de usuario o empresa asignada
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
              .normalize("NFD").replace(/[̀-ͯ]/g, "")
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
            // Bloque de captura en caso de que la respuesta de error no sea JSON válido
          }
        }

        // Bloque de captura de conflicto por sesión simultánea activa (código HTTP 409)
        if (err.status === 409 || errorData?.session_conflict) {
          this.sessionConflictMessage = errorData?.message || 'Has iniciado sesión en otro dispositivo, por favor cierra esa sesión e intenta nuevamente.';
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

        if (err.status === 0) {
          alert('No fue posible contactar al servidor. Esto puede deberse a que el servidor se encuentra iniciando (cold start de Render) o a intermitencia en la red. Por favor reintenta en unos segundos.');
          return;
        }

        alert('Credenciales incorrectas o error en el servidor. Revisa la consola.');
      }
    });
  }

  // Bloque para enviar la nueva contraseña en caso de primer ingreso obligatorio
  submitNewPassword(): void {
    this.isLoading = true;
    const payload = {
      email: this.credentials.email,
      current_password: this.credentials.password,
      new_password: this.changePasswordData.newPassword
    };

    // Bloque de petición HTTP para actualizar la contraseña inicial
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
