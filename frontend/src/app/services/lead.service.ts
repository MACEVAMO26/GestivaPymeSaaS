import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Lead {
  id?: number;
  nombre: string;
  telefono: string;
  correo: string;
  horario_llamada?: string;
  mensaje?: string;
  estado?: string;
  notas?: any;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = '/api/leads';

  private getHeaders() {
    const user = this.authService.getUser();
    const empresaId = user?.empresa_id || user?.empresa?.id || '';
    return { 'X-Empresa-Id': empresaId.toString() };
  }

  getLeads(): Observable<Lead[]> {
    return this.http.get<Lead[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  crearLead(lead: Lead): Observable<Lead> {
    return this.http.post<Lead>(this.apiUrl, lead, { headers: this.getHeaders() });
  }

  actualizarLead(id: number, data: Partial<Lead>): Observable<Lead> {
    return this.http.patch<Lead>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  eliminarLead(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
