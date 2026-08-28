import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Caja {
  id?: number;
  usuario_id?: number;
  fecha_apertura?: string;
  fecha_cierre?: string;
  base_inicial: number;
  total_ingresos?: number;
  total_egresos?: number;
  saldo_final?: number;
  estado: 'abierta' | 'cerrada';
  observaciones?: string;
}

export interface CajaMovimiento {
  id?: number;
  caja_id: number;
  usuario_id?: number;
  tipo: 'apertura' | 'ingreso' | 'egreso' | 'cierre';
  monto: number;
  concepto: string;
  comprobante_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CajaService {
  private http = inject(HttpClient);
  private apiUrl = '/api/cajas';

  getCajas(): Observable<Caja[]> {
    return this.http.get<Caja[]>(this.apiUrl);
  }

  crearCaja(base_inicial: number, observaciones?: string): Observable<Caja> {
    return this.http.post<Caja>(this.apiUrl, { base_inicial, observaciones });
  }

  abrirCaja(id: number, base_inicial: number, observaciones?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/abrir`, { base_inicial, observaciones });
  }

  cerrarCaja(id: number, saldo_final: number, observaciones?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/cerrar`, { saldo_final, observaciones });
  }

  registrarMovimiento(movimiento: CajaMovimiento): Observable<CajaMovimiento> {
    return this.http.post<CajaMovimiento>(`${this.apiUrl}/${movimiento.caja_id}/movimientos`, movimiento);
  }

  getMovimientos(cajaId: number): Observable<CajaMovimiento[]> {
    return this.http.get<CajaMovimiento[]>(`${this.apiUrl}/${cajaId}/movimientos`);
  }
}
