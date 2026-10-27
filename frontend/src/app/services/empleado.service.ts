import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {

  private apiUrl = '/api';
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // Bloque para obtener encabezados de autorización HTTP
  private getHeaders() {
    return {
      headers: {
        Authorization: `Bearer ${this.authService.getToken()}`
      }
    };
  }

  // --- GESTION HUMANA ---
  
  // Bloque para consultar usuarios pendientes de formalización
  getPendientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleados/pendientes`, this.getHeaders());
  }

  // Bloque para consultar el listado de empleados formalizados
  getEmpleados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleados`, this.getHeaders());
  }

  // Bloque para formalizar un usuario y registrar su contrato
  formalizarEmpleado(usuarioId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/empleados/${usuarioId}/formalizar`, data, this.getHeaders());
  }

  // Bloque para actualizar los términos contractuales del empleado
  updateContrato(empleadoId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/empleados/${empleadoId}/contrato`, data, this.getHeaders());
  }

  // Bloque para generar y descargar certificado laboral en PDF
  descargarCertificado(empleadoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/empleados/${empleadoId}/certificado`, { ...this.getHeaders(), responseType: 'blob' as 'json' });
  }

  // Bloque para tramitar el retiro o desvinculación de un empleado
  solicitarBaja(empleadoId: number, motivo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleados/${empleadoId}/solicitar-baja`, { motivo }, this.getHeaders());
  }

  aprobarBaja(empleadoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleados/${empleadoId}/aprobar-baja`, {}, this.getHeaders());
  }

  // --- ESTRUCTURA ORGANIZACIONAL ---
  private cargos$?: Observable<any[]>;
  // Bloque para consultar el catálogo de cargos de la empresa
  getCargos(): Observable<any[]> {
    if (!this.cargos$) {
      this.cargos$ = this.http.get<any[]>(`${this.apiUrl}/cargos`, this.getHeaders()).pipe(shareReplay(1));
    }
    return this.cargos$;
  }

  private areas$?: Observable<any[]>;
  getAreas(): Observable<any[]> {
    if (!this.areas$) {
      this.areas$ = this.http.get<any[]>(`${this.apiUrl}/areas`, this.getHeaders()).pipe(shareReplay(1));
    }
    return this.areas$;
  }

  private roles$?: Observable<any[]>;
  getRoles(): Observable<any[]> {
    if (!this.roles$) {
      this.roles$ = this.http.get<any[]>(`${this.apiUrl}/roles`, this.getHeaders()).pipe(shareReplay(1));
    }
    return this.roles$;
  }

  // --- CONFIGURACIONES ---
  getConfiguracion(empresaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/empresas/${empresaId}/configuracion-rrhh`, this.getHeaders());
  }

  updateConfiguracion(empresaId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/empresas/${empresaId}/configuracion-rrhh`, data, this.getHeaders());
  }

  // --- DOCUMENTOS DE EMPLEADOS ---
  getDocumentos(empleadoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleados/${empleadoId}/documentos`, this.getHeaders());
  }

  getMisDocumentos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mis-documentos`, this.getHeaders());
  }

  uploadDocumento(empleadoId: number, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/empleados/${empleadoId}/documentos`, formData, this.getHeaders());
  }

  deleteDocumento(documentoId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/documentos/${documentoId}`, this.getHeaders());
  }

  // --- CRUD AREAS Y CARGOS ---
  createArea(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/areas`, data, this.getHeaders());
  }

  updateArea(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/areas/${id}`, data, this.getHeaders());
  }

  createCargo(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/cargos`, data, this.getHeaders());
  }

  updateCargo(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/cargos/${id}`, data, this.getHeaders());
  }

  // --- CONFIGURACION RRHH ---
  updateRRHHSettings(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/empresas/rrhh/settings`, data, this.getHeaders());
  }

  // --- AUTOGESTION AFILIACIONES ---
  getMisAfiliaciones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/autogestion/afiliaciones`, this.getHeaders());
  }

  guardarAfiliaciones(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/autogestion/afiliaciones`, formData, this.getHeaders());
  }

  gestionarAfiliacionEmpleado(empleadoId: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/autogestion/empleado/${empleadoId}/afiliaciones`, formData, this.getHeaders());
  }
}
