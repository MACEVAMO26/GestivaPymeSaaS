import { VolverDirective } from '../../../../../../shared/directives/volver.directive';
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
  imports: [CommonModule, FormsModule, VolverDirective],
  templateUrl: './admin-roles.html',
  styleUrl: './admin-roles.scss'
})
export class AdminRoles implements OnInit {
  // --- INYECCION DE DEPENDENCIAS Y SERVICIOS ---
  private rolesService = inject(RolesService);
  private modulosService = inject(ModulosService);
  private estructuraService = inject(EstructuraService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  // --- VARIABLES DE ESTADO Y ROLES ---
  roles: any[] = [];
  areas: any[] = [];
  isLoading = true;
  isModalOpen = false;
  isSaving = false;

  nuevoRol = {
    nombre: '',
    descripcion: ''
  };

  pageSize = 8;
  pageRoles = 1;

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

  paquetesNombres: Record<string, string> = {
    base: 'MÓDULOS BASE',
    ventas: 'PAQUETE DE VENTAS',
    servicios: 'PAQUETE DE SERVICIOS',
    rrhh: 'GESTIÓN HUMANA',
    finanzas: 'FINANZAS',
    addons: 'ADDONS / IA'
  };

  // Bloque para obtener los roles paginados
  get paginatedRoles(): any[] {
    const start = (this.pageRoles - 1) * this.pageSize;
    return this.roles.slice(start, start + this.pageSize);
  }

  // Bloque para calcular el total de paginas de roles
  get totalPagesRoles(): number {
    return Math.ceil(this.roles.length / this.pageSize) || 1;
  }

  // Bloque de ciclo de vida para inicializar datos
  ngOnInit() {
    this.cargarDatos();
  }

  // Bloque para cargar areas y desencadenar carga de roles
  cargarDatos() {
    this.isLoading = true;
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

  // Bloque para cargar el listado de roles registrados
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

  // Bloque para abrir modal de nuevo rol
  abrirModal() { 
    this.nuevoRol = {
      nombre: '', descripcion: ''
    };
    this.isModalOpen = true; 
  }
  
  // Bloque para cerrar modal de nuevo rol
  cerrarModal() { 
    this.isModalOpen = false; 
  }

  // Bloque para guardar y crear un nuevo rol
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

  // Bloque para cambiar el estado activo o inactivo de un rol
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

  // Bloque para abrir el editor de permisos para un rol especifico
  abrirPermisos(rol: any) {
    this.rolPermisos = rol;
    this.iniciarPermisos();
  }

  // Bloque para inicializar la matriz de permisos y cargar catalogo de modulos
  private iniciarPermisos() {
    this.permisosSeleccion = {};
    this.modulosCatalogo = [];
    this.isPermisosOpen = true;
    this.cdr.detectChanges();

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

  // Bloque para cargar los permisos existentes del rol desde el backend
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

  // Bloque para verificar si una accion especifica esta concedida en un modulo
  esAccion(moduloId: string, accion: string): boolean {
    return !!(this.permisosSeleccion[moduloId]?.[accion as keyof AccionesPermiso]);
  }

  // Bloque para alternar el permiso de una accion en un modulo
  toggleAccion(moduloId: string, accion: string) {
    const p = this.permisosSeleccion[moduloId];
    if (!p) return;
    
    if (accion === 'puede_inactivar' && this.rolPermisos?.nombre?.toLowerCase() === 'operativo') {
      this.toast.warning('Los operativos no pueden tener permisos de inactivar/eliminar');
      return;
    }
    
    (p as any)[accion] = !(p as any)[accion];
  }

  // Bloque para seleccionar todas las acciones de todos los modulos
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

  // Bloque para deseleccionar todas las acciones de todos los modulos
  deseleccionarTodos() {
    Object.keys(this.permisosSeleccion).forEach(moduloId => {
      this.acciones.forEach(acc => {
        (this.permisosSeleccion[moduloId] as any)[acc.key] = false;
      });
    });
  }

  // Bloque para obtener los paquetes unicos presentes en el catalogo
  getPaquetesCatalogo(): string[] {
    const paquetes = new Set<string>();
    this.modulosCatalogo.forEach(m => paquetes.add(m.paquete || 'base'));
    return Array.from(paquetes);
  }

  // Bloque para obtener los modulos que pertenecen a un paquete
  getModulosByPaquete(paquete: string): any[] {
    return this.modulosCatalogo.filter(m => (m.paquete || 'base') === paquete);
  }

  // Bloque para obtener el nombre descriptivo de un paquete
  getPaqueteNombre(paquete: string): string {
    return this.paquetesNombres[paquete] || paquete.toUpperCase();
  }

  // Bloque para obtener el nombre legible de un modulo por su id
  moduloNombre(moduloId: string): string {
    const modulo = this.modulosCatalogo.find((a) => a.id === moduloId);
    return modulo ? modulo.nombre : moduloId;
  }

  // Bloque para obtener el paquete al que pertenece un modulo
  moduloPaquete(moduloId: string): string {
    const modulo = this.modulosCatalogo.find((a) => a.id === moduloId);
    return modulo ? modulo.paquete : '';
  }

  // Bloque para comprobar si un modulo tiene al menos una accion activa
  tienePermisoActivo(moduloId: string): boolean {
    const p = this.permisosSeleccion[moduloId];
    if (!p) return false;
    return this.acciones.some((a) => !!(p as any)[a.key]);
  }

  // Bloque para cerrar el panel de edicion de permisos
  cerrarPermisos() {
    this.isPermisosOpen = false;
    this.rolPermisos = null;
  }

  // Bloque para guardar en lote la configuracion de permisos del rol
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
