import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ServicioMaterial {
  id?: number;
  ticket_id?: number;
  producto_id: number;
  cantidad: number;
  producto?: any;
}

export interface ServicioTicket {
  id?: number;
  empresa_id?: number;
  consecutivo?: string;
  cliente_nombre: string;
  servicio_requerido: string;
  fecha_solicitada?: string;
  hora_sugerida?: string;
  direccion?: string;
  estado: 'Pendiente' | 'Asignado' | 'En Sitio' | 'Finalizado' | 'Cancelado';
  tecnico_id?: number;
  notas_ejecucion?: string;
  materiales?: ServicioMaterial[];
}

@Injectable({
  providedIn: 'root'
})
export class OperariosTicketsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/servicios-tickets';

  getTickets(): Observable<ServicioTicket[]> {
    return this.http.get<ServicioTicket[]>(this.apiUrl);
  }

  crearTicket(ticket: ServicioTicket): Observable<ServicioTicket> {
    return this.http.post<ServicioTicket>(this.apiUrl, ticket);
  }

  actualizarEstado(id: number, estado: string, tecnicoId?: number, notas?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/estado`, { estado, tecnico_id: tecnicoId, notas_ejecucion: notas });
  }

  agregarMaterial(ticketId: number, material: ServicioMaterial): Observable<any> {
    return this.http.post(`${this.apiUrl}/${ticketId}/materiales`, material);
  }
}
