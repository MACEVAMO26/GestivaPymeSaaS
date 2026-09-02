import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadoService } from '../../../../../services/empleado.service';
import { ToastService } from '../../../../../services/toast.service';
import { timeout } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { AdminEstructura } from '../administracion/admin-estructura/admin-estructura';
@Component({
  selector: 'app-formalizacion',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminEstructura],
  templateUrl: './formalizacion.component.html',
  styleUrl: './formalizacion.component.scss'
})
export class FormalizacionComponent implements OnInit {
  private http = inject(HttpClient);
  roles: any[] = [];
  isAreaModalOpen = false;
  areaForm: any = {};
  isCargoModalOpen = false;
  cargoForm: any = {};

  private empleadoService = inject(EmpleadoService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  currentTab: string = 'pendientes';

  areas: any[] = [];
  cargos: any[] = [];
  sedes: any[] = [];
  pendientes: any[] = [];
  formalizados: any[] = [];
  

  isFormalizarModalOpen = false;
  isSubmitting = false;
  
  // Opciones estándar colombianas de Seguridad Social
  listaEPS = ['Sura', 'Sanitas', 'Compensar', 'SaludTotal', 'NuevaEPS', 'Famisanar', 'Aliansalud'];
  listaPensiones = ['Proteccion', 'Porvenir', 'Colfondos', 'Skandia', 'Colpensiones'];
  listaCesantias = ['Proteccion', 'Porvenir', 'Colfondos', 'FNA'];
  listaARL = ['SURA', 'Positiva', 'Seguros Bolívar', 'AXA Colpatria', 'La Equidad'];
  listaCajas = ['Compensar', 'Colsubsidio', 'Cafam', 'Comfama', 'Comfenalco'];

  formalizarForm: any = {
    usuario_id: null,
    sede_id: '',
    area_id: '',
    cargo_id: '',
    fecha_contratacion: '',
    tipo_contrato: 'Indefinido',
    salario: '',
    eps: 'Sura',
    fondo_pension: 'Proteccion',
    fondo_cesantias: 'Proteccion',
    arl: 'SURA',
    caja_compensacion: 'Compensar'
  };
  usuarioAFormalizar: any = null;

  // --- EDITAR EMPLEADO FORMALIZADO Y PERMISOS DE MÓDULOS ---
  listaModulosDisponibles = [
    { id: 'd_tar', nombre: 'Gestión de Tareas', icono: 'fas fa-tasks' },
    { id: 'v_cxc', nombre: 'Clientes', icono: 'fas fa-address-book' },
    { id: 'v_pos', nombre: 'Ventas', icono: 'fas fa-cash-register' },
    { id: 'v_inv', nombre: 'Inventario', icono: 'fas fa-boxes' },
    { id: 'v_rep', nombre: 'Compras', icono: 'fas fa-file-invoice-dollar' },
    { id: 'v_prov', nombre: 'Proveedores', icono: 'fas fa-truck' },
    { id: 's_cat', nombre: 'Servicios', icono: 'fas fa-concierge-bell' },
    { id: 's_age', nombre: 'Agenda', icono: 'fas fa-calendar-alt' },
    { id: 'finanzas', nombre: 'Finanzas / Caja', icono: 'fas fa-wallet' },
    { id: 'rrhh', nombre: 'Gestión Humana', icono: 'fas fa-user-friends' },
    { id: 'd_adm', nombre: 'Administración', icono: 'fas fa-cog' },
    { id: 'd_for', nombre: 'Formalización', icono: 'fas fa-user-check' },
    { id: 'addons', nombre: 'Addons+', icono: 'fas fa-puzzle-piece' }
  ];

  isEditarEmpleadoModalOpen = false;
  empleadoAEditar: any = null;
  editarEmpleadoForm: any = {
    id: null,
    sede_id: '',
    area_id: '',
    cargo_id: '',
    tipo_contrato: '',
    fecha_contratacion: '',
    salario: '',
    eps: 'Sura',
    fondo_pension: 'Proteccion',
    fondo_cesantias: 'Proteccion',
    arl: 'SURA',
    caja_compensacion: 'Compensar',
    estado: 'activo',
    modulos_permitidos: {}
  };

  ngOnInit(): void {
    this.cargarPendientes();
    this.cargarSedes();
    this.cargarAreas();
    this.cargarCargos();
    this.cargarFormalizados();
      this.cargarRoles();
  }

  cargarSedes() {
    this.http.get<any[]>('/api/sedes').pipe(timeout(15000)).subscribe({
      next: (res) => { this.sedes = res; },
      error: () => { this.sedes = []; }
    });
  }

  setTab(tab: string) {
    this.currentTab = tab;
  }

  cargarPendientes() {
    this.empleadoService.getPendientes().pipe(timeout(15000)).subscribe({
      next: (res) => { this.pendientes = res; this.cdr.detectChanges(); },
      error: (err) => { 
        if (err.name === 'TimeoutError') this.toast.error('La operación tardó demasiado.');
        this.pendientes = []; 
        this.cdr.detectChanges(); 
      }
    });
  }

  cargarFormalizados() {
    this.empleadoService.getEmpleados().pipe(timeout(15000)).subscribe({
      next: (res) => { this.formalizados = res; this.cdr.detectChanges(); },
      error: (err) => { 
        if (err.name === 'TimeoutError') this.toast.error('La operación tardó demasiado.');
        this.formalizados = []; 
        this.cdr.detectChanges(); 
      }
    });
  }

  cargarAreas() {
    this.empleadoService.getAreas().pipe(timeout(15000)).subscribe({
      next: (res) => { this.areas = res; },
      error: () => { this.areas = []; }
    });
  }

  cargarCargos() {
    this.empleadoService.getCargos().pipe(timeout(15000)).subscribe({
      next: (res) => { this.cargos = res; },
      error: () => { this.cargos = []; }
    });
  }

  abrirModalFormalizar(p: any) {
    this.usuarioAFormalizar = p;
    this.formalizarForm = {
      usuario_id: p.id,
      sede_id: this.sedes.length > 0 ? this.sedes[0].id : '',
      area_id: '',
      cargo_id: '',
      tipo_contrato: 'Indefinido',
      fecha_contratacion: new Date().toISOString().slice(0, 10),
      salario: '',
      eps: 'Sura',
      fondo_pension: 'Proteccion',
      fondo_cesantias: 'Proteccion',
      arl: 'SURA',
      caja_compensacion: 'Compensar'
    };
    this.isFormalizarModalOpen = true;
  }

  cerrarModalFormalizar() {
    this.isFormalizarModalOpen = false;
  }

  getCargosPorArea(areaId: any) {
    if (!areaId) return [];
    // Filtrar por area_id, pero también excluir los cargos maestros si no pertenecen estrictamente al área
    return this.cargos.filter(c => c.area_id == areaId && c.nombre !== 'Jefe de Recursos Humanos' && c.nombre !== 'Gerente General');
  }

  submitFormalizar() {
    if (!this.formalizarForm.sede_id || !this.formalizarForm.area_id || !this.formalizarForm.cargo_id || !this.formalizarForm.tipo_contrato || !this.formalizarForm.fecha_contratacion) {
      this.toast.warning('Complete los datos organizacionales y laborales');
      return;
    }
    if (!this.usuarioAFormalizar?.id) return;
    this.isSubmitting = true;
    this.empleadoService.formalizarEmpleado(this.usuarioAFormalizar.id, {
      sede_id: this.formalizarForm.sede_id,
      area_id: this.formalizarForm.area_id,
      cargo_id: this.formalizarForm.cargo_id,
      tipo_contrato: this.formalizarForm.tipo_contrato,
      fecha_contratacion: this.formalizarForm.fecha_contratacion,
      salario: this.formalizarForm.salario,
      eps: this.formalizarForm.eps,
      fondo_pension: this.formalizarForm.fondo_pension,
      fondo_cesantias: this.formalizarForm.fondo_cesantias,
      arl: this.formalizarForm.arl,
      caja_compensacion: this.formalizarForm.caja_compensacion
    }).pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.cerrarModalFormalizar();
        this.toast.success(res.message || 'Empleado formalizado');
        this.cargarPendientes();
        this.cargarFormalizados();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        if (err.name === 'TimeoutError') {
          this.toast.error('La operación tardó demasiado, intenta nuevamente.');
        } else {
          this.toast.error(err.error?.error || 'Error al formalizar el empleado');
        }
        this.cdr.detectChanges();
      }
    });
  }

  nombreCompleto(u: any): string {
    if (!u) return '';
    return [u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido].filter(Boolean).join(' ');
  }

  // --- MÉTODOS DE EDICIÓN DE PERFIL Y PERMISOS DE MÓDULOS DE EMPLEADO FORMALIZADO ---
  abrirModalEditarEmpleado(e: any) {
    this.empleadoAEditar = e;
    const mods = e.modulos_permitidos || {};
    let modObj: { [key: string]: boolean } = {};
    if (Array.isArray(mods)) {
      mods.forEach((m: string) => modObj[m] = true);
    } else if (typeof mods === 'object') {
      modObj = { ...mods };
    }

    this.editarEmpleadoForm = {
      id: e.id,
      sede_id: e.sede_id || '',
      area_id: e.area_id || '',
      cargo_id: e.cargo_id || '',
      tipo_contrato: e.tipo_contrato || 'Término Indefinido',
      fecha_contratacion: e.fecha_contratacion ? e.fecha_contratacion.substring(0, 10) : '',
      salario: e.salario || 0,
      eps: e.eps || 'Sura',
      fondo_pension: e.fondo_pension || 'Proteccion',
      fondo_cesantias: e.fondo_cesantias || 'Proteccion',
      arl: e.arl || 'SURA',
      caja_compensacion: e.caja_compensacion || 'Compensar',
      estado: e.estado || 'activo',
      modulos_permitidos: modObj
    };
    this.isEditarEmpleadoModalOpen = true;
  }

  cerrarModalEditarEmpleado() {
    this.isEditarEmpleadoModalOpen = false;
    this.empleadoAEditar = null;
  }

  isModuloPermitido(modId: string): boolean {
    return !!this.editarEmpleadoForm.modulos_permitidos[modId];
  }

  toggleModuloPermitido(modId: string) {
    this.editarEmpleadoForm.modulos_permitidos[modId] = !this.editarEmpleadoForm.modulos_permitidos[modId];
  }

  submitEditarEmpleado() {
    if (!this.editarEmpleadoForm.id) return;
    this.isSubmitting = true;

    this.http.put(`/api/empleados/${this.editarEmpleadoForm.id}`, this.editarEmpleadoForm).pipe(timeout(15000)).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.cerrarModalEditarEmpleado();
        this.toast.success(res.message || 'Perfil y permisos de módulos actualizados');
        this.cargarFormalizados();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        if (err.name === 'TimeoutError') {
          this.toast.error('La operación tardó demasiado');
        } else {
          this.toast.error('Error al actualizar el empleado');
        }
        this.cdr.detectChanges();
      }
    });
  }

  cargoNombre(e: any): string {
    return e?.cargo?.nombre || '—';
  }

  areaNombre(e: any): string {
    return e?.area?.nombre || '—';
  }

  cargarRoles() {
    this.http.get('/api/roles').subscribe((res: any) => this.roles = res);
  }

// --- Areas ---
  abrirModalArea(area?: any) {
    this.areaForm = area ? { ...area } : { nombre: '', descripcion: '' };
    this.isAreaModalOpen = true;
  }
  cerrarModalArea() {
    this.isAreaModalOpen = false;
  }
  guardarArea() {
    if (!this.areaForm.nombre) {
      this.toast.warning('El nombre del área es obligatorio');
      return;
    }
    this.isSubmitting = true;
    const obs = this.areaForm.id
      ? this.empleadoService.updateArea(this.areaForm.id, { nombre: this.areaForm.nombre, descripcion: this.areaForm.descripcion })
      : this.empleadoService.createArea({ nombre: this.areaForm.nombre, descripcion: this.areaForm.descripcion });
    obs.pipe(timeout(15000)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.cerrarModalArea();
        this.toast.success('Área guardada');
        this.cargarAreas();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.isSubmitting = false;
        this.toast.error('Error al guardar el área');
        this.cdr.detectChanges();
      }
    });
  }


// --- Cargos ---
  abrirModalCargo(cargo?: any) {
    this.cargoForm = cargo ? { ...cargo } : { nombre: '', rol_id: '', descripcion: '' };
    this.isCargoModalOpen = true;
  }
  cerrarModalCargo() {
    this.isCargoModalOpen = false;
  }
  guardarCargo() {
    if (!this.cargoForm.nombre || !this.cargoForm.rol_id) {
      this.toast.warning('El nombre y el rol son obligatorios');
      return;
    }
    this.isSubmitting = true;
    const payload = {
      nombre: this.cargoForm.nombre,
      rol_id: this.cargoForm.rol_id,
      descripcion: this.cargoForm.descripcion
    };
    const obs = this.cargoForm.id
      ? this.empleadoService.updateCargo(this.cargoForm.id, payload)
      : this.empleadoService.createCargo(payload);
    obs.pipe(timeout(15000)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.cerrarModalCargo();
        this.toast.success('Cargo guardado');
        this.cargarCargos();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.isSubmitting = false;
        this.toast.error('Error al guardar el cargo');
        this.cdr.detectChanges();
      }
    });
  }

}
