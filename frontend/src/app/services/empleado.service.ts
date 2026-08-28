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

  // Obtener headers de autorización
  private getHeaders() {
    return {
      headers: {
        Authorization: `Bearer ${this.authService.getToken()}`
      }
    };
  }

  // --- GESTIÓN HUMANA ---
  
  // Trae los usuarios "cáscara" pendientes de formalizar
  getPendientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleados/pendientes`, this.getHeaders());
  }

  // Trae los empleados ya formalizados
  getEmpleados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleados`, this.getHeaders());
  }

  // Formaliza un usuario y lo convierte en empleado
  formalizarEmpleado(usuarioId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/empleados/${usuarioId}/formalizar`, data, this.getHeaders());
  }

  // Actualiza los datos del contrato (tipo, fechas, salario)
  updateContrato(empleadoId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/empleados/${empleadoId}/contrato`, data, this.getHeaders());
  }

  // Genera el certificado laboral en PDF
  descargarCertificado(empleadoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/empleados/${empleadoId}/certificado`, { ...this.getHeaders(), responseType: 'blob' as 'json' });
  }

  // Despide / Da de baja a un empleado
  solicitarBaja(empleadoId: number, motivo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleados/${empleadoId}/solicitar-baja`, { motivo }, this.getHeaders());
  }

  aprobarBaja(empleadoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleados/${empleadoId}/aprobar-baja`, {}, this.getHeaders());
  }

  // --- Cargos, Áreas y Roles (Listados para el formulario) ---
  private cargos$?: Observable<any[]>;
  getCargos(): Observable<any[]> {
    if (!this.cargos$) {
      this.cargos$ = this.http.get<any[]>(`${this.apiUrl}/cargos`, this.getHeaders()).pipe(shareReplay(1));
    }
    return this.cargos$;
  }

  // Asumimos que existe un endpoint /areas en api.php
  // Si no existe, lo tendremos que crear o usar roles provisionalmente
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

  // --- CRUD ÁREAS Y CARGOS ---
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

  // --- CONFIGURACIÓN RRHH ---
  updateRRHHSettings(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/empresas/rrhh/settings`, data, this.getHeaders());
  }

  // --- AUTOGESTIÓN: AFILIACIONES ---
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
