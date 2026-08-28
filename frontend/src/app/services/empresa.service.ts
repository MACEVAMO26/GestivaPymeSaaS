import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  private http = inject(HttpClient);
  private apiUrl = '/api/empresas';

  // Los headers de autenticación los inyecta automáticamente el authInterceptor

  // Obtener todas las empresas
  getEmpresas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener una empresa específica
  getEmpresa(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getSuscripcionesStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/suscripciones`);
  }

  getSystemStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/system`);
  }

  // Crear una nueva empresa
  createEmpresa(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  // Actualizar una empresa existente
  updateEmpresa(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  // Actualizar tarifas (descuentos, extras, addons)
  updateTarifas(id: number, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/tarifas`, data);
  }

  // Cambiar estado activo/inactivo
  renovarSuscripcion(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/renovar`, {});
  }

  noRenovarSuscripcion(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/norenovar`, {});
  }

  toggleStatus(id: number, accion: string = ''): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { accion });
  }
}
