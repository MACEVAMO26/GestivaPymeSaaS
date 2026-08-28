import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Inventario {
  id?: number;
  producto_id: number;
  stock_actual: number;
  stock_minimo?: number;
  bodega?: string;
  estante?: string;
  posicion?: string;
  producto?: any; // Para mostrar nombre del producto
}

export interface MovimientoInventario {
  id?: number;
  inventario_id: number;
  usuario_id?: number;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste' | 'recepcion' | 'venta';
  cantidad: number;
  observaciones?: string;
  fecha_hora?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private http = inject(HttpClient);
  private apiUrl = '/api/inventario';

  getInventario(): Observable<Inventario[]> {
    return this.http.get<Inventario[]>(this.apiUrl);
  }

  getMovimientos(): Observable<MovimientoInventario[]> {
    return this.http.get<MovimientoInventario[]>('/api/movimientos-inventario');
  }

  registrarMovimiento(movimiento: MovimientoInventario): Observable<any> {
    return this.http.post('/api/movimientos-inventario', movimiento);
  }
}
