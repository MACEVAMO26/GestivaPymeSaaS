import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cliente {
  id?: number;
  nombres: string;
  apellidos?: string;
  nombre_razon_social?: string;
  documento: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  tipo_cliente?: string;
  membresia?: string;
  pedidos_activos?: number;
  estado_pedido?: string;
  estado_financiero?: string;
  comentarios?: string;
  activo: boolean;
  created_at?: string;
}

export interface Historial360Response {
  cliente: Cliente;
  metricas: {
    total_compras: number;
    cantidad_ventas: number;
    cantidad_cotizaciones: number;
    cantidad_servicios: number;
    servicios_finalizados: number;
    calificacion_promedio: number;
    pedidos_activos: number;
  };
  ventas: any[];
  cotizaciones: any[];
  tickets: any[];
  timeline: Array<{
    tipo: 'VENTA' | 'PEDIDO' | 'COTIZACION' | 'SERVICIO';
    icono: string;
    color: string;
    fecha: string;
    titulo: string;
    descripcion: string;
    monto: number;
    estado: string;
    calificacion_tecnico?: number;
    feedback_tecnico?: string;
    calificacion_cliente?: number;
    feedback_cliente?: string;
    equipo_recibido?: string;
    falla_reportada?: string;
    detalles?: any[];
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private http = inject(HttpClient);
  private apiUrl = '/api/clientes';

  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.apiUrl);
  }

  getCliente(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/${id}`);
  }

  getHistorial360(id: number): Observable<Historial360Response> {
    return this.http.get<Historial360Response>(`${this.apiUrl}/${id}/historial-360`);
  }

  crearCliente(cliente: Cliente): Observable<any> {
    return this.http.post<any>(this.apiUrl, cliente);
  }

  actualizarCliente(id: number, cliente: Cliente): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, cliente);
  }

  eliminarCliente(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
