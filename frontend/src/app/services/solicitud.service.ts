import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Solicitud {
  id: number;
  empresa_id: number;
  solicitante_id: number;
  decisor_id?: number;
  area: string;
  entidad?: string;
  entidad_id?: number;
  accion: string;
  motivo?: string;
  documento_url?: string;
  estado: 'pendiente' | 'en_replica' | 'ejecutada' | 'rechazada';
  nota_final?: string;
  created_at?: string;
  solicitante?: any;
  decisor?: any;
  respuestas?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class SolicitudService {
  private http = inject(HttpClient);
  private apiUrl = '/api/solicitudes';

  getMisSolicitudes(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(this.apiUrl);
  }

  getBandeja(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(`${this.apiUrl}/bandeja`);
  }

  crear(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  responder(id: number, mensaje: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/responder`, { mensaje });
  }

  aprobar(id: number, notaFinal?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/aprobar`, { nota_final: notaFinal || null });
  }

  rechazar(id: number, notaFinal: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/rechazar`, { nota_final: notaFinal });
  }
}