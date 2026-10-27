import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TarifaService {
  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  private http = inject(HttpClient);
  private apiUrl = '/api/tarifas';

  // Bloque para obtener los encabezados de autorización HTTP para peticiones al backend
  private getHeaders() {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Bloque para consultar el catálogo de tarifas y paquetes disponibles desde el backend
  getCatalogo(): Observable<any> {
    return this.http.get('/api/saas/tarifas/catalogo', { headers: this.getHeaders() });
  }

  // Bloque para persistir las actualizaciones de precios y planes en el catálogo global
  updateCatalogo(items: any[]): Observable<any> {
    return this.http.put('/api/saas/tarifas/catalogo', { items }, { headers: this.getHeaders() });
  }
}
