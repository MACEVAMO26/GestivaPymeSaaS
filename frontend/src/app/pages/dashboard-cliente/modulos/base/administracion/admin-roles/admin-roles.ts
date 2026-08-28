import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs';
import { RolesService } from '../../../../../../services/roles.service';
import { ModulosService } from '../../../../../../services/modulos.service';
import { ToastService } from '../../../../../../services/toast.service';
import { EstructuraService } from '../../../../../../services/estructura.service';

interface AccionesPermiso {
  puede_ver: boolean;
  puede_crear: boolean;
  puede_editar: boolean;
  puede_inactivar: boolean;
  puede_descargar: boolean;
  puede_subir: boolean;
  id?: number;
}

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-roles.html',
  styleUrl: './admin-roles.scss'
})
export class AdminRoles implements OnInit {
  private rolesService = inject(RolesService);
  private modulosService = inject(ModulosService);
  private estructuraService = inject(EstructuraService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  roles: any[] = [];
  areas: any[] = [];
  isLoading = true;
  isModalOpen = false;
  isSaving = false;

  nuevoRol = {
    nombre: '',
    descripcion: ''
  };

  // --- EDITOR DE PERMISOS ---
  isPermisosOpen = false;
  isPermisosSaving = false;
  rolPermisos: any = null;
  modulosCatalogo: any[] = [];
  permisosSeleccion: { [moduloId: string]: AccionesPermiso } = {};
  acciones: { key: string; label: string }[] = [
    { key: 'puede_ver', label: 'Ver' },
    { key: 'puede_crear', label: 'Crear' },
    { key: 'puede_editar', label: 'Editar' },
    { key: 'puede_inactivar', label: 'Inactivar' },
    { key: 'puede_descargar', label: 'Descargar' },
    { key: 'puede_subir', label: 'Subir' }
  ];

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.isLoading = true;
    
    // Fetch areas
    this.estructuraService.getAreas().subscribe({
      next: (areasData) => {
        this.areas = areasData;
        this.cargarRoles();
      },
      error: () => {
        this.toast.error('Error al cargar las áreas');
        this.cargarRoles();
      }
    });
  }

  cargarRoles() {
    this.rolesService.getRoles().pipe(timeout(10000)).subscribe({
      next: (data) => {
        this.roles = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } else {
          this.toast.error('No se pudieron cargar los roles');
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }


  abrirModal() { 
    this.nuevoRol = {
      nombre: '', descripcion: ''
    };
    this.isModalOpen = true; 
  }
  
  cerrarModal() { 
    this.isModalOpen = false; 
  }

  guardarRol() {
    if (!this.nuevoRol.nombre) {
      this.toast.warning('Debe ingresar un nombre para el rol');
      return;
    }

    this.isSaving = true;
    this.rolesService.createRole(this.nuevoRol).pipe(timeout(10000)).subscribe({
      next: (res) => {
        this.toast.success('Rol creado exitosamente');
        this.isSaving = false;
        this.cerrarModal();
        this.cargarRoles();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } else {
          this.toast.error(err.error?.message || 'Error al crear el rol');
        }
        this.cdr.detectChanges();
      }
    });
  }

  cambiarEstado(rol: any) {
    if (rol.nombre === 'Gerente General' || rol.nombre === 'Jefe de Área') {
      this.toast.warning('No se puede cambiar el estado de un rol reservado por el sistema');
      return;
    }

    this.rolesService.changeStatus(rol.id).pipe(timeout(10000)).subscribe({
      next: (res) => {
        rol.activo = !rol.activo;
        this.toast.success(res.message || 'Estado actualizado');
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } else {
          this.toast.error('Error al cambiar el estado del rol');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // --- EDITOR DE PERMISOS ---

  abrirPermisos(rol: any) {
    this.rolPermisos = rol;
    this.iniciarPermisos();
  }


  private iniciarPermisos() {
    this.permisosSeleccion = {};
    this.modulosCatalogo = [];
    this.isPermisosOpen = true;
    this.cdr.detectChanges();

    // Catálogo de módulos desde los módulos activos de la empresa
    this.modulosService.getMisModulos().pipe(timeout(10000)).subscribe({
      next: (resp) => {
        const modulos = resp?.modulos || {};
        const areas: any[] = [];
        Object.keys(modulos).forEach((paquete) => {
          (modulos[paquete] || []).forEach((sub: any) => {
            if (sub.activo) {
              areas.push({ id: sub.id, nombre: sub.nombre, paquete });
            }
          });
        });
        // Módulos base siempre presentes en permisos
        const baseFijos = [
          { id: 'd_ini', nombre: 'Inicio' },
          { id: 'd_adm', nombre: 'Administración' },
          { id: 'd_tar', nombre: 'Gestión de Tareas' },
          { id: 'd_for', nombre: 'Formalización' },
          { id: 'd_gia', nombre: 'Gestiva IA' },
          { id: 'd_aut', nombre: 'Autogestión' }
        ];
        baseFijos.forEach((bf) => {
          if (!areas.some((a) => a.id === bf.id)) {
            areas.push({ id: bf.id, nombre: bf.nombre, paquete: 'base' });
          }
        });
        this.modulosCatalogo = areas;
        this.cargarPermisosExistentes();
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        // Si falla el catálogo, al menos cargar los módulos base
        this.modulosCatalogo = [
          { id: 'd_ini', nombre: 'Inicio', paquete: 'base' },
          { id: 'd_adm', nombre: 'Administración', paquete: 'base' },
          { id: 'd_tar', nombre: 'Gestión de Tareas', paquete: 'base' },
          { id: 'd_for', nombre: 'Formalización', paquete: 'base' },
          { id: 'd_gia', nombre: 'Gestiva IA', paquete: 'base' },
          { id: 'd_aut', nombre: 'Autogestión', paquete: 'base' }
        ];
        this.cargarPermisosExistentes();
        this.cdr.detectChanges();
      }
    });
  }

  private cargarPermisosExistentes() {
    this.rolesService.getPermisos().pipe(timeout(10000)).subscribe({
      next: (permisos: any[]) => {
        (permisos || [])
          .filter((p) => p.rol_id === this.rolPermisos?.id)
          .forEach((p) => {
            this.permisosSeleccion[p.modulo_id] = {
              puede_ver: !!p.puede_ver,
              puede_crear: !!p.puede_crear,
              puede_editar: !!p.puede_editar,
              puede_inactivar: !!p.puede_inactivar,
              puede_descargar: !!p.puede_descargar,
              puede_subir: !!p.puede_subir,
              id: p.id
            };
          });
        // Asegurar entrada por cada módulo del catálogo
        this.modulosCatalogo.forEach((a) => {
          if (!this.permisosSeleccion[a.id]) {
            this.permisosSeleccion[a.id] = {
              puede_ver: false,
              puede_crear: false,
              puede_editar: false,
              puede_inactivar: false,
              puede_descargar: false,
              puede_subir: false
            };
          }
        });
        
        // Si el rol es Operativo, forzar inactivar y eliminar (si lo hubiera, pero la acción es puede_inactivar) a false
        if (this.rolPermisos?.nombre?.toLowerCase() === 'operativo') {
          Object.values(this.permisosSeleccion).forEach(p => {
            p.puede_inactivar = false;
          });
        }
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } else {
          this.toast.error('No se pudieron cargar los permisos del rol');
        }
        this.cdr.detectChanges();
      }
    });
  }

  esAccion(moduloId: string, accion: string): boolean {
    return !!(this.permisosSeleccion[moduloId]?.[accion as keyof AccionesPermiso]);
  }

  toggleAccion(moduloId: string, accion: string) {
    const p = this.permisosSeleccion[moduloId];
    if (!p) return;
    
    // Operativos cannot have puede_inactivar
    if (accion === 'puede_inactivar' && this.rolPermisos?.nombre?.toLowerCase() === 'operativo') {
      this.toast.warning('Los operativos no pueden tener permisos de inactivar/eliminar');
      return;
    }
    
    (p as any)[accion] = !(p as any)[accion];
  }

  // --- FUNCIONES DE SELECCIÓN MASIVA ---
  seleccionarTodos() {
    Object.keys(this.permisosSeleccion).forEach(moduloId => {
      this.acciones.forEach(acc => {
        if (this.rolPermisos?.nombre?.toLowerCase() === 'operativo' && acc.key === 'puede_inactivar') {
           (this.permisosSeleccion[moduloId] as any)[acc.key] = false;
        } else {
           (this.permisosSeleccion[moduloId] as any)[acc.key] = true;
        }
      });
    });
  }

  deseleccionarTodos() {
    Object.keys(this.permisosSeleccion).forEach(moduloId => {
      this.acciones.forEach(acc => {
        (this.permisosSeleccion[moduloId] as any)[acc.key] = false;
      });
    });
  }

  // --- AGRUPACIÓN DE MÓDULOS ---
  paquetesNombres: Record<string, string> = {
    base: 'MÓDULOS BASE',
    ventas: 'PAQUETE DE VENTAS',
    servicios: 'PAQUETE DE SERVICIOS',
    rrhh: 'GESTIÓN HUMANA',
    finanzas: 'FINANZAS',
    addons: 'ADDONS / IA'
  };

  getPaquetesCatalogo(): string[] {
    const paquetes = new Set<string>();
    this.modulosCatalogo.forEach(m => paquetes.add(m.paquete || 'base'));
    return Array.from(paquetes);
  }

  getModulosByPaquete(paquete: string): any[] {
    return this.modulosCatalogo.filter(m => (m.paquete || 'base') === paquete);
  }

  getPaqueteNombre(paquete: string): string {
    return this.paquetesNombres[paquete] || paquete.toUpperCase();
  }

  moduloNombre(moduloId: string): string {
    const modulo = this.modulosCatalogo.find((a) => a.id === moduloId);
    return modulo ? modulo.nombre : moduloId;
  }

  moduloPaquete(moduloId: string): string {
    const modulo = this.modulosCatalogo.find((a) => a.id === moduloId);
    return modulo ? modulo.paquete : '';
  }

  tienePermisoActivo(moduloId: string): boolean {
    const p = this.permisosSeleccion[moduloId];
    if (!p) return false;
    return this.acciones.some((a) => !!(p as any)[a.key]);
  }

  cerrarPermisos() {
    this.isPermisosOpen = false;
    this.rolPermisos = null;
  }

  guardarPermisos() {
    if (!this.rolPermisos?.id) return;
    this.isPermisosSaving = true;

    const payload: any[] = [];
    Object.keys(this.permisosSeleccion).forEach((moduloId) => {
      const p = this.permisosSeleccion[moduloId];
      const fila: any = {
        modulo_id: moduloId,
        puede_ver: !!p.puede_ver ? 1 : 0,
        puede_crear: !!p.puede_crear ? 1 : 0,
        puede_editar: !!p.puede_editar ? 1 : 0,
        puede_inactivar: !!p.puede_inactivar ? 1 : 0,
        puede_descargar: !!p.puede_descargar ? 1 : 0,
        puede_subir: !!p.puede_subir ? 1 : 0
      };
      
      fila.rol_id = this.rolPermisos.id;
      
      if (p.id) {
        fila.id = p.id;
        payload.push(fila);
      } else if (this.acciones.some((a) => !!(p as any)[a.key])) {
        payload.push(fila);
      }
    });

    this.rolesService.batchPermisos(payload).pipe(timeout(10000)).subscribe({
      next: (res) => {
        this.isPermisosSaving = false;
        this.toast.success('Permisos actualizados correctamente');
        this.cerrarPermisos();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isPermisosSaving = false;
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        } else {
          this.toast.error(err.error?.error || 'Error al guardar los permisos');
        }
        this.cdr.detectChanges();
      }
    });
  }
}
