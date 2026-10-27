import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SoporteService {
  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  private http = inject(HttpClient);
  private apiUrl = '/api/soporte';

  // Bloque para obtener los tickets de soporte del usuario o empresa autenticada
  getTickets(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Bloque para registrar un nuevo ticket de soporte en la base de datos
  createTicket(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  // Bloque para consultar las solicitudes administrativas asociadas a la empresa
  getAdminRequests(): Observable<any[]> {
    return this.http.get<any[]>('/api/admin-requests/my-requests');
  }

  // Bloque para crear una nueva solicitud administrativa con archivos adjuntos
  createAdminRequest(formData: FormData): Observable<any> {
    return this.http.post<any>('/api/admin-requests', formData);
  }
}
