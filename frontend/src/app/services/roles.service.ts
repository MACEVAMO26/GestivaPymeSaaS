import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private http = inject(HttpClient);
  private apiUrl = '/api/roles';

  // Los headers de autenticación los inyecta automáticamente el authInterceptor

  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getRole(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createRole(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateRole(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  changeStatus(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, {});
  }

  getPermisos(): Observable<any[]> {
    return this.http.get<any[]>('/api/permisos');
  }

  batchPermisos(permisos: any[]): Observable<any> {
    return this.http.post<any>('/api/permisos/batch', { permisos });
  }
}
