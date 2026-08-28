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

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  // 2. Método para el inicio de sesión
  login(credentials: {email: string, password: string}): Observable<any> {
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

  // 3. Método para cerrar sesión
  logout(): void {
    // Limpiamos el almacenamiento local
    try {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('current_user');
      sessionStorage.removeItem('modulos_activos');
    } catch (e) {}

    // Redirigimos al usuario a la página de login
    this.router.navigate(['/login']);
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
