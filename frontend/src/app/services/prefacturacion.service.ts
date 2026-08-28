import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CotizacionDetalle {
  id?: number;
  cotizacion_pedido_id?: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface CotizacionPedido {
  id?: number;
  cliente_id: number;
  vendedor_id?: number;
  total: number;
  estado: 'borrador' | 'enviado' | 'aprobado' | 'rechazado';
  notas?: string;
  valido_hasta?: string;
  detalles?: CotizacionDetalle[];
}

@Injectable({
  providedIn: 'root'
})
export class PrefacturacionService {
  private http = inject(HttpClient);
  private apiUrl = '/api/cotizaciones-pedidos';

  getCotizaciones(): Observable<CotizacionPedido[]> {
    return this.http.get<CotizacionPedido[]>(this.apiUrl);
  }

  registrarCotizacion(cotizacion: CotizacionPedido): Observable<any> {
    return this.http.post(this.apiUrl, cotizacion);
  }

  cambiarEstado(id: number, estado: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/estado`, { estado });
  }
}
