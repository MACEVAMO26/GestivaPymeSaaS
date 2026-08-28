import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TarifaService {
  private http = inject(HttpClient);
  private apiUrl = '/api/tarifas';

  private getHeaders() {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getCatalogo(): Observable<any> {
    return this.http.get('/api/saas/tarifas/catalogo', { headers: this.getHeaders() });
  }

  updateCatalogo(items: any[]): Observable<any> {
    return this.http.put('/api/saas/tarifas/catalogo', { items }, { headers: this.getHeaders() });
  }
}
