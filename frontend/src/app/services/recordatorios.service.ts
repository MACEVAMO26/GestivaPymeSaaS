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
  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  private http = inject(HttpClient);
  private apiUrl = '/api/recordatorios';

  // Bloque para consultar el listado de recordatorios activos desde el backend
  getRecordatorios(): Observable<Recordatorio[]> {
    return this.http.get<Recordatorio[]>(this.apiUrl);
  }

  // Bloque para registrar un nuevo recordatorio en la base de datos
  agregarRecordatorio(recordatorio: any): Observable<Recordatorio> {
    return this.http.post<Recordatorio>(this.apiUrl, recordatorio);
  }

  // Bloque para eliminar un recordatorio por identificador
  eliminarRecordatorio(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Bloque para alternar el estado de completado de un recordatorio
  marcarCompletado(id: number, completado: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/completado`, { completado });
  }
}
