import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // --- VARIABLES DE ESTADO ---
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

  // Bloque para iniciar sesión y autenticar usuario
  login(credentials: {email: string, password: string, force_logout?: boolean}): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.requires_password_change) {
          return;
        }

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

  // Bloque para cambiar la contraseña inicial obligatoria
  changeInitialPassword(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/change-initial-password`, data);
  }

  // Bloque para solicitar recuperación de contraseña
  recuperarPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/recuperar-password`, { email });
  }

  // Bloque para verificar el estado activo de la sesión (heartbeat)
  checkSession(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/session-check`);
  }

  // Bloque para iniciar el monitoreo periódico de sesión activa
  startHeartbeat(): void {
    this.stopHeartbeat();
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

  // Bloque para detener el monitoreo periódico de sesión
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Bloque para cerrar sesión de forma inmediata y revocar token
  logout(redirectToLogin: boolean = true): void {
    this.stopHeartbeat();
    const token = this.getToken();

    this.clearSessionStorage();

    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => {},
        error: () => {}
      });
    }

    if (redirectToLogin) {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  // Bloque para limpiar los datos de sesión almacenados en el navegador
  clearSessionStorage(): void {
    this.stopHeartbeat();
    try {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('current_user');
      sessionStorage.removeItem('modulos_activos');
      localStorage.removeItem('saas_current_view');
      localStorage.removeItem('gestiva_last_activity');
    } catch (e) {}
  }

  // --- GESTION DE ALMACENAMIENTO LOCAL ---

  // Bloque para guardar el token de autenticación
  private saveToken(token: string): void {
    try {
      sessionStorage.setItem('auth_token', token);
    } catch (e) { console.warn('sessionStorage not accessible'); }
  }

  // Bloque para obtener el token de autenticación almacenado
  getToken(): string | null {
    try {
      return sessionStorage.getItem('auth_token');
    } catch (e) { return null; }
  }

  // Bloque para guardar los datos del usuario autenticado
  private saveUser(user: any): void {
    try {
      sessionStorage.setItem('current_user', JSON.stringify(user));
    } catch (e) { console.warn('sessionStorage not accessible'); }
  }

  // Bloque para obtener los datos del usuario autenticado
  getUser(): any | null {
    try {
      const user = sessionStorage.getItem('current_user');
      return user ? JSON.parse(user) : null;
    } catch (e) { return null; }
  }

  // Bloque para actualizar los datos del usuario en almacenamiento local
  setUser(userData: any): void {
    sessionStorage.setItem('current_user', JSON.stringify(userData));
  }

  // Bloque para guardar los módulos activos asignados
  private saveModulosActivos(modulos: any): void {
    try {
      sessionStorage.setItem('modulos_activos', JSON.stringify(modulos));
    } catch (e) { console.warn('sessionStorage not accessible'); }
  }

  // Bloque para obtener la lista de módulos activos asignados
  getModulosActivos(): Record<string, boolean> | null {
    try {
      const modulosJson = sessionStorage.getItem('modulos_activos');
      return modulosJson ? JSON.parse(modulosJson) : null;
    } catch (e) { return null; }
  }
}
