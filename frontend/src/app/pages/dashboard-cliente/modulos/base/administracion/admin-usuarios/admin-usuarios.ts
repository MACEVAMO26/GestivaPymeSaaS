import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingSpinnerComponent } from '../../../../../../shared/components/loading-spinner/loading-spinner';
import { timeout } from 'rxjs';
import { UsuariosService } from '../../../../../../services/usuarios.service';
import { ToastService } from '../../../../../../services/toast.service';
import { AuthService } from '../../../../../../services/auth.service';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-usuarios.html',
  styleUrl: './admin-usuarios.scss'
})
export class AdminUsuarios implements OnInit {
  private usuariosService = inject(UsuariosService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  usuarios: any[] = [];
  isLoading = true;
  showModal = false;
  isSubmitting = false;
  errorMessage = '';

  // LEY: El Gerente General es el primer cargo de la empresa y el único autorizado
  // para inactivar al Jefe de Recursos Humanos (los datos se conservan por ley colombiana).
  esGerente(): boolean {
    const rol = this.authService.getUser()?.rol?.nombre;
    return rol === 'Gerente General' || rol === 'Gerente';
  }

  esJefeRRHH(usuario: any): boolean {
    return usuario?.rol?.nombre === 'Jefe de Área';
  }

  esGerenteGeneral(usuario: any): boolean {
    return usuario?.rol?.nombre === 'Gerente General' || usuario?.rol?.nombre === 'Gerente';
  }

  esAuditor(usuario: any): boolean {
    return usuario?.rol?.nombre === 'Auditor';
  }

  // Un empleado regular siempre puede inactivarse desde aquí;
  // el Jefe de RRHH SOLO puede inactivarlo el gerente; el gerente nunca.
  puedeInactivar(usuario: any): boolean {
    if (this.esGerenteGeneral(usuario) || this.esAuditor(usuario)) return false;
    if (this.esJefeRRHH(usuario)) return this.esGerente();
    return true;
  }

  formData: any = {
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    tipo_documento: 'CC',
    documento: '',
    email_personal: '',
    telefono: '',
    direccion: ''
  };

  isApprovingBaja = false;
  tempPasswordGenerated = '';
  emailGenerado = '';
  nuevoUsuarioNombre = '';

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.isLoading = true;
    this.errorMessage = '';
    this.usuariosService.getUsuarios().pipe(timeout(15000)).subscribe({
      next: (data) => {
        this.usuarios = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { console.error('Error en cargarUsuarios:', err);
        this.toast.error('No se pudieron cargar los usuarios');
        this.errorMessage = 'No se pudieron cargar los usuarios.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  isEditMode = false;
  editingUserId: number | null = null;

  abrirModal() { 
    this.isEditMode = false;
    this.editingUserId = null;
    this.formData = {
      primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '',
      tipo_documento: 'CC', documento: '', email_personal: '', telefono: '', direccion: ''
    };
    this.tempPasswordGenerated = '';
    this.emailGenerado = '';
    this.nuevoUsuarioNombre = '';
    this.showModal = true; 
  }

  abrirModalEditar(usuario: any) {
    this.isEditMode = true;
    this.editingUserId = usuario.id;
    this.formData = {
      primer_nombre: usuario.primer_nombre || '',
      segundo_nombre: usuario.segundo_nombre || '',
      primer_apellido: usuario.primer_apellido || '',
      segundo_apellido: usuario.segundo_apellido || '',
      tipo_documento: usuario.tipo_documento || 'CC',
      documento: usuario.documento || '',
      email_personal: usuario.email_personal || '',
      telefono: usuario.telefono || '',
      direccion: usuario.direccion || ''
    };
    this.tempPasswordGenerated = '';
    this.emailGenerado = '';
    this.nuevoUsuarioNombre = '';
    this.showModal = true;
  }
  
  cerrarModal() { 
    this.showModal = false;
    this.isEditMode = false;
    this.editingUserId = null;
    this.tempPasswordGenerated = ''; 
  }

  guardarUsuario() {
    if (this.isEditMode) {
      this.actualizarUsuario();
    } else {
      this.crearUsuario();
    }
  }

  actualizarUsuario() {
    if (!this.formData.primer_nombre || !this.formData.primer_apellido || !this.formData.documento) {
      this.toast.warning('Por favor llena todos los campos obligatorios');
      return;
    }

    if (!this.editingUserId) return;

    this.isSubmitting = true;

    this.usuariosService.updateUsuario(this.editingUserId, this.formData).subscribe({
      next: (res) => {
        this.toast.success('Usuario actualizado exitosamente');
        this.isSubmitting = false;
        this.cerrarModal();
        this.cargarUsuarios();
      },
      error: (err) => {
        console.error('Error al actualizar usuario:', err);
        this.isSubmitting = false;
        this.toast.error(err.error?.message || 'Error al actualizar el usuario');
      }
    });
  }

  crearUsuario() {
    if (!this.formData.primer_nombre || !this.formData.primer_apellido || !this.formData.segundo_apellido || !this.formData.documento || !this.formData.email_personal) {
      this.toast.warning('Por favor llena todos los campos obligatorios');
      return;
    }

    this.isSubmitting = true;
    
    const payload = {
       ...this.formData
    };

    this.usuariosService.createUsuario(payload).subscribe({
      next: (res) => {
        this.toast.success('Usuario creado exitosamente');
        this.isSubmitting = false;
        
        // Vista de éxito
        this.nuevoUsuarioNombre = this.formData.primer_nombre + ' ' + this.formData.primer_apellido;
        this.emailGenerado = res.email || this.formData.email_personal;
        this.tempPasswordGenerated = res.password || 'T3mp0r4l123*';
        
        this.cargarUsuarios();
      },
      error: (err) => { console.error('Error en crearUsuario:', err);
        this.isSubmitting = false;
        this.toast.error(err.error?.message || 'Error al crear el usuario');
      }
    });
  }

  eliminarUsuario(usuario: any) {
    if (!this.puedeInactivar(usuario)) {
      this.toast.error('No tienes permisos para eliminar este usuario.');
      return;
    }

    const nombreCompleto = `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim() || usuario.email;
    if (!confirm(`¿Estás seguro de eliminar permanentemente al usuario ${nombreCompleto}? Esta acción no se puede deshacer.`)) return;

    this.usuariosService.deleteUsuario(usuario.id).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Usuario eliminado exitosamente');
        this.cargarUsuarios();
      },
      error: (err) => {
        console.error('Error al eliminar usuario:', err);
        this.toast.error(err.error?.error || 'Error al eliminar el usuario');
      }
    });
  }

  cambiarEstado(usuario: any) {
    if (!this.puedeInactivar(usuario)) {
      if (this.esGerenteGeneral(usuario)) {
        this.toast.error('El Gerente General no puede ser inactivado.');
      } else {
        this.toast.error('Solo el Gerente General puede inactivar al Jefe de Recursos Humanos.');
      }
      return;
    }

    const accion = usuario.activo ? 'inactivar' : 'activar';
    const nombreCompleto = `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim() || usuario.email;
    if (!confirm(`¿Estás seguro de ${accion} a ${nombreCompleto}?`)) return;

    this.usuariosService.changeStatus(usuario.id).subscribe({
      next: (res) => {
        usuario.activo = !usuario.activo;
        this.toast.success(res.message || 'Estado actualizado');
      },
      error: (err) => { console.error('Error en cambiarEstado:', err);
        this.toast.error(err.error?.error || 'Error al cambiar el estado del usuario');
      }
    });
  }

  aprobarBaja(usuario: any) {
    this.isApprovingBaja = true;
    setTimeout(() => {
       usuario.activo = false;
       if (usuario.empleado) {
          usuario.empleado.baja_solicitada = false;
       }
       this.toast.success('Baja aprobada correctamente');
       this.isApprovingBaja = false;
    }, 1000);
  }

  // --- AGRUPACIÓN DE USUARIOS POR ROL ---
  // Orden jerárquico de roles para mostrar los bloques en la tabla
  private readonly ORDEN_ROLES = [
    'Gerente General',
    'Gerente',
    'Jefe de Área',
    'Coordinador de Área',
    'Operativo',
  ];

  // Obtiene el nombre de rol de un usuario buscando en su empleado primero, luego en el usuario
  private obtenerNombreRol(u: any): string {
    return u?.empleado?.cargo?.rol?.nombre
      || u?.rol?.nombre
      || 'Pendiente RRHH';
  }

  // Devuelve la lista de nombres de rol únicos presentes en los usuarios,
  // ordenados según la jerarquía definida en ORDEN_ROLES
  get rolesPresentes(): string[] {
    const roles = new Set<string>(this.usuarios.map(u => this.obtenerNombreRol(u)));
    const ordenados = this.ORDEN_ROLES.filter(r => roles.has(r));
    // Agrega roles que no están en ORDEN_ROLES al final
    roles.forEach(r => { if (!this.ORDEN_ROLES.includes(r)) ordenados.push(r); });
    return ordenados;
  }

  // Filtra los usuarios que pertenecen a un Rol dado
  getUsuariosPorRol(nombreRol: string): any[] {
    return this.usuarios.filter(u => this.obtenerNombreRol(u) === nombreRol);
  }
}
