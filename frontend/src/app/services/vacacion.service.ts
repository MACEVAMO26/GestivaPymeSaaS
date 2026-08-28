import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Vacacion {
  id?: number;
  usuario_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: 'Disfrute Legal' | 'Colectivas' | 'Anticipadas';
  observaciones?: string;
  estado?: 'pendiente' | 'aprobada' | 'rechazada';
  justificacion_respuesta?: string;
  usuario?: {
    nombres: string;
    apellidos: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class VacacionService {
  private http = inject(HttpClient);
  private apiUrl = '/api/vacaciones';

  getVacaciones(): Observable<Vacacion[]> {
    return this.http.get<Vacacion[]>(this.apiUrl);
  }

  responder(id: number, estado: string, justificacion?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/responder`, { estado, justificacion_respuesta: justificacion });
  }
}