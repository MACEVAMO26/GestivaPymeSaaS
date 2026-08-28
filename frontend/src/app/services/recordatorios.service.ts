import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Recordatorio {
  id?: any;
  titulo: string;
  descripcion: string;
  completado: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecordatoriosService {
  private http = inject(HttpClient);
  private apiUrl = '/api/recordatorios';

  getRecordatorios(): Observable<Recordatorio[]> {
    return this.http.get<Recordatorio[]>(this.apiUrl);
  }

  agregarRecordatorio(recordatorio: any): Observable<Recordatorio> {
    return this.http.post<Recordatorio>(this.apiUrl, recordatorio);
  }

  eliminarRecordatorio(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  marcarCompletado(id: number, completado: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/completado`, { completado });
  }
}
