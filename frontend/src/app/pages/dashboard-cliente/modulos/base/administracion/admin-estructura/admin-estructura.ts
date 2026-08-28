import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingSpinnerComponent } from '../../../../../../shared/components/loading-spinner/loading-spinner';
import { FormsModule } from '@angular/forms';
import { forkJoin, timeout } from 'rxjs';
import { EstructuraService } from '../../../../../../services/estructura.service';
import { RolesService } from '../../../../../../services/roles.service';
import { ModulosService } from '../../../../../../services/modulos.service';
import { ToastService } from '../../../../../../services/toast.service';

@Component({
  selector: 'app-admin-estructura',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-estructura.html',
  styleUrl: './admin-estructura.scss'
})
export class AdminEstructura implements OnInit {
  private estructuraService = inject(EstructuraService);
  private rolesService = inject(RolesService);
  private modulosService = inject(ModulosService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  activeTab: 'sedes' | 'areas' | 'cargos' = 'sedes';
  
  sedes: any[] = [];
  areas: any[] = [];
  cargos: any[] = [];
  roles: any[] = [];
  modulosDisponibles: any[] = [];
  paquetesModulos: any = {};

  isLoading = true;
  isSaving = false;

  // Modales
  isModalSedeOpen = false;
  isModalAreaOpen = false;
  isModalCargoOpen = false;
  editandoSedeId: number | null = null;

  // Formularios
  nuevaSede = { nombre: '', direccion: '', telefono: '', estado: 'activa' };
  nuevaArea = { nombre: '', descripcion: '', modulos: [] as string[] };
  nuevoCargo = { nombre: '', descripcion: '', funciones: '', rol_id: '', area_id: '' };

  ngOnInit() {
    this.cargarDatos();
  }

  setTab(tab: 'sedes' | 'areas' | 'cargos') {
    this.activeTab = tab;
  }

  cargarDatos() {
    this.isLoading = true;
    
    // Cargar todo en paralelo
    forkJoin({
      sedes: this.estructuraService.getSedes(),
      areas: this.estructuraService.getAreas(),
      cargos: this.estructuraService.getCargos(),
        modulos: this.modulosService.getMisModulos(),
      roles: this.rolesService.getRoles()
    }).subscribe({
      next: (data) => {
        this.sedes = data.sedes;
        this.areas = data.areas;
        this.cargos = data.cargos;
          if (data.modulos && data.modulos.modulos) {
            this.paquetesModulos = data.modulos.modulos;
          }
          this.construirModulosSidebar();
        this.roles = data.roles;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.construirModulosSidebar();
        this.toast.error('No se pudieron cargar los datos de la estructura');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  construirModulosSidebar() {
    const modulosSidebarCatalogo: any[] = [
      { id: 'rrhh', nombre: 'Gestión Humana' },
      { id: 'v_prov', nombre: 'Proveedores' },
      { id: 'v_rep', nombre: 'Compras' },
      { id: 'v_inv', nombre: 'Inventario' },
      { id: 'v_pos', nombre: 'Ventas' },
      { id: 'v_cxc', nombre: 'Clientes' },
      { id: 's_age', nombre: 'Agenda y Calendario' },
      { id: 's_cat', nombre: 'Servicios' },
      { id: 'finanzas', nombre: 'Finanzas' }
    ];

    const modulosEmpresa = this.paquetesModulos || {};

    this.modulosDisponibles = modulosSidebarCatalogo.filter(mod => {

      if (['rrhh', 'finanzas'].includes(mod.id)) {
        const subs = modulosEmpresa[mod.id] || [];
        return subs.some((s: any) => s.activo);
      }

      for (const paquete of ['ventas', 'servicios', 'base']) {
        const subs = modulosEmpresa[paquete] || [];
        const encontrado = subs.find((s: any) => s.id === mod.id && s.activo);
        if (encontrado) return true;
      }

      return Object.keys(modulosEmpresa).length === 0;
    });
  }

  getRoleName(rolId: number): string {
    const rol = this.roles.find(r => r.id === rolId);
    return rol ? rol.nombre : 'Sin Rol';
  }

  getCargosByRol(rolId: number): any[] {
    return this.cargos.filter(c => c.rol_id === rolId);
  }

  // --- MÓDULOS DEL ÁREA ---
  cerrarModales() {
    this.isModalSedeOpen = false;
    this.isModalAreaOpen = false;
    this.isModalCargoOpen = false;
    this.editandoSedeId = null;
  }

  abrirModalSede() {
    this.nuevaSede = { nombre: '', direccion: '', telefono: '', estado: 'activa' };
    this.editandoSedeId = null;
    this.isModalSedeOpen = true;
  }

  abrirEdicionSede(sede: any) {
    this.nuevaSede = { ...sede };
    this.editandoSedeId = sede.id;
    this.isModalSedeOpen = true;
  }

  editandoAreaId: number | null = null;

  abrirModalArea() {
    this.nuevaArea = { nombre: '', descripcion: '', modulos: [] };
    this.editandoAreaId = null;
    this.isModalAreaOpen = true;
  }

  abrirEdicionArea(area: any) {
    this.nuevaArea = { ...area, modulos: area.modulos ? area.modulos.map((m: any) => m.id) : [] };
    this.editandoAreaId = area.id;
    this.isModalAreaOpen = true;
  }

  get modulosDisponiblesParaAreaSeleccionada() {
    let modulosAsignadosAOtros = new Set<string>();
    
    // Si el área actual es Gerencia, no filtramos nada, tiene acceso a todos.
    const areaActual = this.areas.find(a => a.id === this.editandoAreaId);
    if (areaActual && areaActual.nombre.toLowerCase() === 'gerencia') {
      return this.modulosDisponibles;
    }

    this.areas.forEach(area => {
      if (this.editandoAreaId && area.id === this.editandoAreaId) return;
      
      // Los módulos de Gerencia no bloquean a las demás áreas
      if (area.nombre.toLowerCase() === 'gerencia') return;

      if (area.modulos) {
        area.modulos.forEach((m: any) => {
          modulosAsignadosAOtros.add(m.id.toString());
        });
      }
    });
    
    return this.modulosDisponibles.filter(m => {
      const uiId = m.id.toString();
      const dbIds = this.UI_TO_DB_MAP[uiId] || [uiId];
      // Si algun id de bd correspondiente a este uiId ya está asignado, ocultamos el paquete
      return !dbIds.some(dbId => modulosAsignadosAOtros.has(dbId));
    });
  }

  editandoCargoId: number | null = null;

  abrirModalCargo() {
    this.nuevoCargo = { nombre: '', descripcion: '', funciones: '', rol_id: '', area_id: '' };
    this.editandoCargoId = null;
    this.isModalCargoOpen = true;
  }

  abrirEdicionCargo(cargo: any) {
    this.nuevoCargo = { ...cargo };
    this.editandoCargoId = cargo.id;
    this.isModalCargoOpen = true;
  }

  // --- GUARDAR ---
  guardarSede() {
    if (!this.nuevaSede.nombre) {
      this.toast.warning('El nombre de la sede es obligatorio');
      return;
    }
    
    this.isSaving = true;
    if (this.editandoSedeId) {
      this.estructuraService.updateSede(this.editandoSedeId, this.nuevaSede).subscribe({
        next: (res) => {
          this.toast.success('Sede actualizada correctamente');
          this.isSaving = false;
          this.cerrarModales();
          this.cargarDatos();
        this.cdr.detectChanges();
        },
        error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
          this.isSaving = false;
          this.toast.error(err.error?.message || 'Error al actualizar sede');
        this.cdr.detectChanges();
        }
      });
    } else {
      this.estructuraService.createSede(this.nuevaSede).subscribe({
        next: (res) => {
          this.toast.success('Sede creada exitosamente');
          this.isSaving = false;
          this.cerrarModales();
          this.cargarDatos();
        this.cdr.detectChanges();
        },
        error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
          this.isSaving = false;
          this.toast.error(err.error?.message || 'Error al crear sede');
        this.cdr.detectChanges();
        }
      });
    }
  }

  
  UI_TO_DB_MAP: Record<string, string[]> = {
    rrhh: ['r_tur', 'r_vac', 'r_aus'],
    v_prov: ['v_prov'],
    v_rep: ['v_rep'],
    v_inv: ['v_inv'],
    v_pos: ['v_pos'],
    v_cxc: ['v_cxc'],
    s_age: ['s_age'],
    s_cat: ['s_cat'],
    finanzas: ['f_caja']
  };

  isModuloUiSeleccionado(uiId: string): boolean {
    const dbIds = this.UI_TO_DB_MAP[uiId] || [uiId];
    return dbIds.some(dbId => this.nuevaArea.modulos.includes(dbId));
  }

  toggleModuloArea(uiId: string) {
    const dbIds = this.UI_TO_DB_MAP[uiId] || [uiId];
    const estaSeleccionado = this.isModuloUiSeleccionado(uiId);

    if (estaSeleccionado) {
      this.nuevaArea.modulos = this.nuevaArea.modulos.filter(m => !dbIds.includes(m));
    } else {
      dbIds.forEach(dbId => {
        if (!this.nuevaArea.modulos.includes(dbId)) {
          this.nuevaArea.modulos.push(dbId);
        }
      });
    }
  }

  guardarArea() {
    if (!this.nuevaArea.nombre) {
      this.toast.warning('El nombre del área es obligatorio');
      return;
    }

    this.isSaving = true;
    
    if (this.editandoAreaId) {
      this.estructuraService.updateArea(this.editandoAreaId, this.nuevaArea).subscribe({
        next: (res) => {
          this.toast.success('Área actualizada exitosamente');
          this.isSaving = false;
          this.cerrarModales();
          this.cargarDatos();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          if (err?.name === 'TimeoutError') {
            this.toast.error('Tiempo de espera agotado');
          }
          this.isSaving = false;
          this.toast.error(err.error?.message || 'Error al actualizar área');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.estructuraService.createArea(this.nuevaArea).subscribe({
        next: (res) => {
          this.toast.success('Área creada exitosamente');
          this.isSaving = false;
          this.cerrarModales();
          this.cargarDatos();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          if (err?.name === 'TimeoutError') {
            this.toast.error('Tiempo de espera agotado');
          }
          this.isSaving = false;
          this.toast.error(err.error?.message || 'Error al crear área');
          this.cdr.detectChanges();
        }
      });
    }
  }

  guardarCargo() {
    if (!this.nuevoCargo.nombre || !this.nuevoCargo.rol_id || !this.nuevoCargo.area_id) {
      this.toast.warning('El nombre, el rol y el área son obligatorios');
      return;
    }

    this.isSaving = true;

    if (this.editandoCargoId) {
      this.estructuraService.updateCargo(this.editandoCargoId, this.nuevoCargo).subscribe({
        next: (res) => {
          this.toast.success('Cargo actualizado exitosamente');
          this.isSaving = false;
          this.cerrarModales();
          this.cargarDatos();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.toast.error(err.error?.message || 'Error al actualizar cargo');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.estructuraService.createCargo(this.nuevoCargo).subscribe({
        next: (res) => {
          this.toast.success('Cargo creado exitosamente');
          this.isSaving = false;
          this.cerrarModales();
          this.cargarDatos();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.toast.error(err.error?.message || 'Error al crear cargo');
          this.cdr.detectChanges();
        }
      });
    }
  }

  // --- ESTADOS ---
  cambiarEstadoArea(area: any) {
    this.estructuraService.changeAreaStatus(area.id).subscribe({
      next: (res) => {
        area.activo = !area.activo;
        this.toast.success('Estado del área actualizado');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.toast.error('Error al cambiar el estado del área');
        this.cdr.detectChanges();
      }
    });
  }

  cambiarEstadoCargo(cargo: any) {
    if (cargo.nombre === 'Jefe de Recursos Humanos') {
      this.toast.warning('El Cargo de Recursos Humanos Base no se puede desactivar.');
      return;
    }

    this.estructuraService.changeCargoStatus(cargo.id).subscribe({
      next: (res) => {
        cargo.activo = !cargo.activo;
        this.toast.success('Estado del cargo actualizado');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado');
        }
        this.toast.error('Error al cambiar el estado del cargo');
        this.cdr.detectChanges();
      }
    });
  }
}
