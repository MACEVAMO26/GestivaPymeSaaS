import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TiempoService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  // --- TURNOS ---
  getTurnos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/turnos`);
  }

  crearTurno(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos`, data);
  }

  actualizarTurno(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/turnos/${id}`, data);
  }

  cambiarEstadoTurno(id: number, estado: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/turnos/${id}/status`, { activo: estado });
  }

  asignarTurno(turnoId: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos/${turnoId}/asignar`, data);
  }

  // --- VACACIONES ---
  getVacaciones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/vacaciones`);
  }

  getMisVacaciones(usuarioId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/vacaciones?usuario_id=${usuarioId}`);
  }

  solicitarVacaciones(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/vacaciones`, data);
  }

  actualizarVacaciones(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/vacaciones/${id}`, data);
  }

  responderVacaciones(id: number, data: { estado: string, justificacion_respuesta?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/vacaciones/${id}/responder`, data);
  }
}
