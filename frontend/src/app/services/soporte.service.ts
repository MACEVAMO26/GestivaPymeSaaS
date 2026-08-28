import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SoporteService {
  private http = inject(HttpClient);
  private apiUrl = '/api/soporte';

  // Obtener tickets del usuario/empresa
  getTickets(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Crear un nuevo ticket
  createTicket(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  // Obtener solicitudes administrativas (AdminRequests)
  getAdminRequests(): Observable<any[]> {
    return this.http.get<any[]>('/api/admin-requests/my-requests');
  }

  // Crear una solicitud administrativa (AdminRequest con archivos)
  createAdminRequest(formData: FormData): Observable<any> {
    return this.http.post<any>('/api/admin-requests', formData);
  }
}
