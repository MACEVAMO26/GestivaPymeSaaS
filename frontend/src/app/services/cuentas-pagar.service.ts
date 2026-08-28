import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CuentaPorPagar {
  id?: number;
  orden_compra_id: number;
  proveedor_id: number;
  total_deuda: number;
  saldo_pendiente: number;
  estado_pago: 'pendiente' | 'parcial' | 'pagado';
  fecha_vencimiento?: string;
  proveedor?: any;
}

@Injectable({
  providedIn: 'root'
})
export class CuentasPagarService {
  private http = inject(HttpClient);
  private apiUrl = '/api/cuentas-por-pagar';

  getCuentas(): Observable<CuentaPorPagar[]> {
    return this.http.get<CuentaPorPagar[]>(this.apiUrl);
  }

  registrarAbono(cuentaId: number, abono: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${cuentaId}/abonos`, { monto: abono });
  }
}
