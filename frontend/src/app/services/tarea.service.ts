import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Tarea {
  id?: number;
  titulo: string;
  descripcion: string;
  asignador_id?: number;
  asignado_id: number;
  estado?: 'notificada' | 'vista' | 'en_proceso' | 'con_dificultades' | 'terminada';
  tipo?: 'individual' | 'cooperativa';
  area_id?: number;
  area?: { id: number, nombre: string };
  empresa_id?: number;
  created_at?: string;
  asignador?: { primer_nombre: string, segundo_nombre?: string, primer_apellido: string, segundo_apellido?: string };
  asignado?: { primer_nombre: string, segundo_nombre?: string, primer_apellido: string, segundo_apellido?: string };
}

@Injectable({
  providedIn: 'root'
})
export class TareaService {
  private http = inject(HttpClient);
  private apiUrl = '/api/tareas';

  getTareas(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(this.apiUrl);
  }

  crearTarea(tarea: any): Observable<any> {
    return this.http.post(this.apiUrl, tarea);
  }

  actualizarEstado(id: number, estado: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/estado`, { estado });
  }
}
