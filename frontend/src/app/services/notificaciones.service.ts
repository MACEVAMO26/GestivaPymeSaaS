import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notificacion {
  id?: number;
  usuario_id?: number;
  titulo: string;
  mensaje?: string;
  descripcion?: string;
  leida: boolean;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private http = inject(HttpClient);
  private apiUrl = '/api/notificaciones';

  getNotificaciones(): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(this.apiUrl);
  }

  marcarLeida(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/leer`, {});
  }
}
