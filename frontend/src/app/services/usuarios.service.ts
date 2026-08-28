import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private http = inject(HttpClient);
  private apiUrl = '/api/usuarios';

  // Los headers de autenticación los inyecta automáticamente el authInterceptor

  getUsuarios(empresaId?: number): Observable<any[]> {
    const url = empresaId ? `${this.apiUrl}?empresa_id=${empresaId}` : this.apiUrl;
    return this.http.get<any[]>(url);
  }

  createUsuario(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateUsuario(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  changeStatus(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, {});
  }

  reenviarCredenciales(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/reenviar-credenciales`, {});
  }

  deleteUsuario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
