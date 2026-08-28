import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Servicio {
  id?: number;
  categoria_id?: number;
  nombre: string;
  descripcion?: string;
  tarifa?: number;
  tiempo_estimado?: string;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogoServiciosService {
  private http = inject(HttpClient);
  private apiUrl = '/api/servicios';

  getServicios(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(this.apiUrl);
  }

  crearServicio(servicio: Servicio): Observable<Servicio> {
    return this.http.post<Servicio>(this.apiUrl, servicio);
  }

  actualizarServicio(id: number, servicio: Servicio): Observable<Servicio> {
    return this.http.put<Servicio>(`${this.apiUrl}/${id}`, servicio);
  }

  eliminarServicio(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
