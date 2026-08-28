import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VentaDetalle {
  id?: number;
  venta_id?: number;
  producto_id?: number;
  servicio_id?: number;
  tipo_item: 'producto' | 'servicio';
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  nombre_item?: string; // Para mostrar en el front
}

export interface Venta {
  id?: number;
  empresa_id?: number;
  cliente_id?: number;
  usuario_id?: number;
  caja_id?: number;
  subtotal: number;
  impuestos: number;
  descuento: number;
  total: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'credito';
  estado: 'completada' | 'pendiente' | 'anulada';
  fecha_venta?: string;
  detalles?: VentaDetalle[];
  cliente?: any; // Datos relacionales
}

@Injectable({
  providedIn: 'root'
})
export class VentaService {
  private http = inject(HttpClient);
  private apiUrl = '/api/ventas';

  getVentas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(this.apiUrl);
  }

  registrarVenta(venta: Venta): Observable<Venta> {
    return this.http.post<Venta>(this.apiUrl, venta);
  }

  anularVenta(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/anular`, {});
  }

  updateEstadoPaquete(id: number, estadoPaquete: string, clienteId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/estado-paquete`, {
      estado_paquete: estadoPaquete,
      cliente_id: clienteId
    });
  }
}
