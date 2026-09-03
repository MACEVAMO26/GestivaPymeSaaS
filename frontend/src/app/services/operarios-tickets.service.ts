import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ServicioMaterial {
  id?: number;
  ticket_id?: number;
  producto_id: number;
  cantidad: number;
  precio_unitario?: number;
  subtotal?: number;
  estado_material?: 'Llevado' | 'Utilizado' | 'Devuelto' | string;
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
  estado: 'Pendiente' | 'Recibido' | 'Asignado' | 'En Camino' | 'En Sitio' | 'Finalizado' | 'Cancelado' | string;
  tecnico_id?: number;
  tecnico?: any;
  notas_ejecucion?: string;
  calificacion_tecnico?: number;
  feedback_tecnico?: string;
  calificacion_cliente?: number;
  feedback_cliente?: string;
  costo_total?: number;
  tiempo_minutos?: number;
  equipo_recibido?: string;
  serie_equipo?: string;
  accesorios_recibidos?: string;
  falla_reportada?: string;
  fecha_finalizacion?: string;
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

  actualizarEstado(id: number, estado: string, tecnicoId?: number, notas?: string, extraData?: any): Observable<any> {
    const payload = { 
      estado, 
      tecnico_id: tecnicoId, 
      notas_ejecucion: notas,
      ...(extraData || {})
    };
    return this.http.put(`${this.apiUrl}/${id}/estado`, payload);
  }

  agregarMaterial(ticketId: number, material: ServicioMaterial): Observable<any> {
    return this.http.post(`${this.apiUrl}/${ticketId}/materiales`, material);
  }

  eliminarMaterial(ticketId: number, materialId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${ticketId}/materiales/${materialId}`);
  }

  calificarTicket(id: number, datos: {
    calificacion_tecnico?: number;
    feedback_tecnico?: string;
    calificacion_cliente?: number;
    feedback_cliente?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/calificar`, datos);
  }
}
