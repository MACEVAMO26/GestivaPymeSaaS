import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  private http = inject(HttpClient);
  private apiUrl = '/api/empresas';

  // Bloque para consultar el listado de empresas registradas
  getEmpresas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Bloque para consultar los detalles de una empresa específica
  getEmpresa(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Bloque para consultar las estadísticas de suscripciones y facturación
  getSuscripcionesStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/suscripciones`);
  }

  // Bloque para consultar las estadísticas operativas y de actividad del sistema
  getSystemStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/system`);
  }

  // Bloque para registrar una nueva empresa en el sistema
  createEmpresa(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  // Bloque para actualizar la información general de una empresa
  updateEmpresa(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  // Bloque para actualizar las tarifas y suscripciones personalizadas de la empresa
  updateTarifas(id: number, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/tarifas`, data);
  }

  // Bloque para registrar la renovación de suscripción de la empresa
  renovarSuscripcion(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/renovar`, {});
  }

  // Bloque para registrar la no renovación de suscripción de la empresa
  noRenovarSuscripcion(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/norenovar`, {});
  }

  // Bloque para alternar el estado activo o inactivo de la empresa
  toggleStatus(id: number, accion: string = ''): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { accion });
  }
}
