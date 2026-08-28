import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EstructuraService {
  private http = inject(HttpClient);

  // Los headers de autenticación los inyecta automáticamente el authInterceptor

  // --- SEDES ---
  getSedes(): Observable<any[]> {
    return this.http.get<any[]>('/api/sedes');
  }

  createSede(data: any): Observable<any> {
    return this.http.post<any>('/api/sedes', data);
  }

  updateSede(id: number, data: any): Observable<any> {
    return this.http.put<any>(`/api/sedes/${id}`, data);
  }

  // --- ÁREAS ---
  getAreas(): Observable<any[]> {
    return this.http.get<any[]>('/api/areas');
  }

  createArea(data: any): Observable<any> {
    return this.http.post<any>('/api/areas', data);
  }

  updateArea(id: number, data: any): Observable<any> {
    return this.http.put<any>(`/api/areas/${id}`, data);
  }

  changeAreaStatus(id: number): Observable<any> {
    return this.http.patch<any>(`/api/areas/${id}/status`, {});
  }

  // --- CARGOS ---
  getCargos(): Observable<any[]> {
    return this.http.get<any[]>('/api/cargos');
  }

  createCargo(data: any): Observable<any> {
    return this.http.post<any>('/api/cargos', data);
  }

  updateCargo(id: number, data: any): Observable<any> {
    return this.http.put<any>(`/api/cargos/${id}`, data);
  }

  changeCargoStatus(id: number): Observable<any> {
    return this.http.patch<any>(`/api/cargos/${id}/status`, {});
  }
}
