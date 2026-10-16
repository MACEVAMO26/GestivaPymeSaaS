import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // 1. URL base de nuestra API en Laravel
  private apiUrl = '/api';
  private heartbeatInterval: any = null;
  private authChannel: BroadcastChannel | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.authChannel = new BroadcastChannel('gestiva_auth_sync');
        this.authChannel.onmessage = (event) => {
          if (event.data?.type === 'NEW_LOGIN' && this.getToken()) {
            this.clearSessionStorage();
            this.router.navigate(['/login'], { queryParams: { motivo: 'sesion_remota' }, replaceUrl: true });
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
    }

    if (this.getToken()) {
      this.startHeartbeat();
    }
  }

  // 2. Método para el inicio de sesión
  login(credentials: {email: string, password: string, force_logout?: boolean}): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        // Si requiere cambio de clave, NO guardamos token ni usuario todavía
        if (response.requires_password_change) {
          return;
        }

        // Si el login es exitoso y normal, guardamos el token y los datos del usuario
        if (response.token && response.user) {
          this.saveToken(response.token);
          this.saveUser(response.user);
          if (response.modulos_activos) {
            this.saveModulosActivos(response.modulos_activos);
          }
          if (this.authChannel) {
            this.authChannel.postMessage({ type: 'NEW_LOGIN', userId: response.user?.id });
          }
          this.startHeartbeat();
        }
      })
    );
  }

  // 2.5 Método para cambiar contraseña inicial
  changeInitialPassword(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/change-initial-password`, data);
  }

  // 2.6 Método para solicitar recuperación de contraseña
  recuperarPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/recuperar-password`, { email });
  }

  // 2.7 Método de verificación de sesión activa (heartbeat / ping)
  checkSession(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/session-check`);
  }

  startHeartbeat(): void {
    this.stopHeartbeat();
    // Ejecutar chequeo cada 20 segundos para detectar si otra sesión cerró la actual
    this.heartbeatInterval = setInterval(() => {
      if (!this.getToken()) {
        this.stopHeartbeat();
        return;
      }
      this.checkSession().subscribe({
        next: () => {},
        error: (err) => {
          if (err?.status === 401) {
            this.stopHeartbeat();
          }
        }
      });
    }, 20000);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 3. Método para cerrar sesión de forma inmediata
  logout(redirectToLogin: boolean = true): void {
    this.stopHeartbeat();
    const token = this.getToken();

    // Limpiamos el almacenamiento local de inmediato para no bloquear la interfaz
    this.clearSessionStorage();

    // Revocamos el token en el servidor en segundo plano sin bloquear la navegación
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => {},
        error: () => {}
      });
    }

    // Redirigimos al usuario a la página de login reemplazando el historial
    if (redirectToLogin) {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  // Limpia todos los datos de sesión almacenados en el navegador
  clearSessionStorage(): void {
    this.stopHeartbeat();
    try {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('current_user');
      sessionStorage.removeItem('modulos_activos');
      localStorage.removeItem('saas_current_view');
    } catch (e) {}
  }


  // --- Métodos de Ayuda (Helpers) para manejar el Local Storage ---

  // 4. Guardar el token en el Local Storage
  private saveToken(token: string): void {
    try {
      sessionStorage.setItem('auth_token', token);
    } catch (e) { console.warn('sessionStorage not accessible'); }
  }

  // 5. Obtener el token del Local Storage
  getToken(): string | null {
    try {
      return sessionStorage.getItem('auth_token');
    } catch (e) { return null; }
  }

  // 6. Guardar los datos del usuario en el Local Storage
  private saveUser(user: any): void {
    try {
      sessionStorage.setItem('current_user', JSON.stringify(user));
    } catch (e) { console.warn('sessionStorage not accessible'); }
  }

  // 7. Obtener los datos del usuario del Local Storage
  getUser(): any | null {
    try {
      const user = sessionStorage.getItem('current_user');
      return user ? JSON.parse(user) : null;
    } catch (e) { return null; }
  }

  setUser(userData: any): void {
    sessionStorage.setItem('current_user', JSON.stringify(userData));
  }

  // 8. Guardar modulos activos
  private saveModulosActivos(modulos: any): void {
    try {
      sessionStorage.setItem('modulos_activos', JSON.stringify(modulos));
    } catch (e) { console.warn('sessionStorage not accessible'); }
  }

  // 9. Obtener modulos activos
  getModulosActivos(): Record<string, boolean> | null {
    try {
      const modulosJson = sessionStorage.getItem('modulos_activos');
      return modulosJson ? JSON.parse(modulosJson) : null;
    } catch (e) { return null; }
  }
}
