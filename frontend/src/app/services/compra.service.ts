import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OrdenCompraDetalle {
  id?: number;
  orden_compra_id?: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal?: number;
}

export interface OrdenCompra {
  id?: number;
  proveedor_id: number;
  usuario_id?: number;
  fecha_requerida?: string;
  estado?: 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'anulada' | 'recibida' | 'pendiente';
  justificacion_rechazo?: string;
  motivo_anulacion?: string;
  total?: number;
  detalles?: OrdenCompraDetalle[];
}

export interface RecepcionDetalle {
  id?: number;
  recepcion_id?: number;
  producto_id: number;
  cantidad_recibida: number;
  estado_calidad?: 'Bueno' | 'Malo' | 'Regular';
}

export interface Recepcion {
  id?: number;
  orden_compra_id: number;
  usuario_id?: number;
  fecha_recepcion?: string;
  observaciones?: string;
  detalles?: RecepcionDetalle[];
}

@Injectable({
  providedIn: 'root'
})
export class CompraService {
  private http = inject(HttpClient);
  
  getOrdenes(): Observable<OrdenCompra[]> {
    return this.http.get<OrdenCompra[]>('/api/ordenes-compra');
  }

  crearOrden(orden: OrdenCompra): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>('/api/ordenes-compra', orden);
  }

  getRecepciones(): Observable<Recepcion[]> {
    return this.http.get<Recepcion[]>('/api/recepciones');
  }

  crearRecepcion(recepcion: Recepcion): Observable<Recepcion> {
    return this.http.post<Recepcion>('/api/recepciones', recepcion);
  }
}
