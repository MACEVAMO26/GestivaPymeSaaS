import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private http = inject(HttpClient);
  private apiUrl = '/api/logs';

  // Los headers de autenticación los inyecta automáticamente el authInterceptor

  getLogs(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
