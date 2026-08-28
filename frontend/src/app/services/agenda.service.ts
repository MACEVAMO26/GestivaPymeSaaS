import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EventoCalendario {
  id?: number;
  usuario_id?: number;
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  color_etiqueta?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgendaService {
  private http = inject(HttpClient);
  private apiUrl = '/api/calendario-eventos';

  getEventos(): Observable<EventoCalendario[]> {
    return this.http.get<EventoCalendario[]>(this.apiUrl);
  }

  crearEvento(evento: EventoCalendario): Observable<EventoCalendario> {
    return this.http.post<EventoCalendario>(this.apiUrl, evento);
  }

  actualizarEvento(id: number, evento: EventoCalendario): Observable<EventoCalendario> {
    return this.http.put<EventoCalendario>(`${this.apiUrl}/${id}`, evento);
  }

  eliminarEvento(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
