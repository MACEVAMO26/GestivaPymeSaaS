import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Reunion {
  id?: number;
  titulo: string;
  descripcion?: string;
  fecha_hora: string;
  tipo_encuentro: 'virtual' | 'presencial';
  audiencia: 'todos' | 'area' | 'gerencia';
  enlace_lugar?: string;
  organizador_id?: number;
  organizador?: {
    nombres: string;
    apellidos: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReunionService {
  private http = inject(HttpClient);
  private apiUrl = '/api/reuniones';

  getReuniones(): Observable<Reunion[]> {
    return this.http.get<Reunion[]>(this.apiUrl);
  }

  crearReunion(reunion: any): Observable<any> {
    return this.http.post(this.apiUrl, reunion);
  }
}
