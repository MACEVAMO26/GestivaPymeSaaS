import { VolverDirective } from '../../../../../../shared/directives/volver.directive';
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
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent, VolverDirective],
  templateUrl: './admin-usuarios.html',
  styleUrl: './admin-usuarios.scss'
})
export class AdminUsuarios implements OnInit {
  // --- INYECCION DE DEPENDENCIAS Y SERVICIOS ---
  private usuariosService = inject(UsuariosService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  // --- VARIABLES DE ESTADO Y FORMULARIO ---
  usuarios: any[] = [];
  isLoading = true;
  showModal = false;
  isSubmitting = false;
  errorMessage = '';
  isEditMode = false;
  editingUserId: number | null = null;
  isApprovingBaja = false;
  tempPasswordGenerated = '';
  emailGenerado = '';
  nuevoUsuarioNombre = '';
  searchTerm: string = '';

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

  private readonly ORDEN_ROLES = [
    'Gerente General',
    'Gerente',
    'Jefe de Área',
    'Coordinador de Área',
    'Operativo',
  ];

  // Bloque para verificar si el usuario logueado es Gerente General o Gerente
  esGerente(): boolean {
    const rol = this.authService.getUser()?.rol?.nombre;
    return rol === 'Gerente General' || rol === 'Gerente';
  }

  // Bloque para verificar si un usuario tiene el cargo de Jefe de Área
  esJefeRRHH(usuario: any): boolean {
    return usuario?.rol?.nombre === 'Jefe de Área';
  }

  // Bloque para verificar si un usuario es Gerente General
  esGerenteGeneral(usuario: any): boolean {
    return usuario?.rol?.nombre === 'Gerente General' || usuario?.rol?.nombre === 'Gerente';
  }

  // Bloque para verificar si un usuario es Auditor
  esAuditor(usuario: any): boolean {
    return usuario?.rol?.nombre === 'Auditor';
  }

  // Bloque para verificar si el usuario logueado tiene permisos de inactivar a otro
  puedeInactivar(usuario: any): boolean {
    if (this.esGerenteGeneral(usuario) || this.esAuditor(usuario)) return false;
    if (this.esJefeRRHH(usuario)) return this.esGerente();
    return true;
  }

  // Bloque para obtener usuarios filtrados segun termino de busqueda
  get usuariosFiltrados(): any[] {
    if (!this.searchTerm || !this.searchTerm.trim()) {
      return this.usuarios;
    }
    const term = this.searchTerm.trim().toLowerCase();
    return this.usuarios.filter(u => {
      const nombreCompleto = `${u.primer_nombre || ''} ${u.segundo_nombre || ''} ${u.primer_apellido || ''} ${u.segundo_apellido || ''}`.toLowerCase();
      const doc = (u.documento || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const area = (u.empleado?.cargo?.area?.nombre || u.area?.nombre || '').toLowerCase();
      const rol = this.obtenerNombreRol(u).toLowerCase();
      return nombreCompleto.includes(term) || doc.includes(term) || email.includes(term) || area.includes(term) || rol.includes(term);
    });
  }

  // Bloque para obtener la lista ordenada de roles presentes en la lista de usuarios
  get rolesPresentes(): string[] {
    const roles = new Set<string>(this.usuariosFiltrados.map(u => this.obtenerNombreRol(u)));
    const ordenados = this.ORDEN_ROLES.filter(r => roles.has(r));
    roles.forEach(r => { if (!this.ORDEN_ROLES.includes(r)) ordenados.push(r); });
    return ordenados;
  }

  // Bloque de ciclo de vida para inicializar el componente y cargar usuarios
  ngOnInit() {
    this.cargarUsuarios();
  }

  // Bloque para cargar el listado completo de usuarios de la empresa
  cargarUsuarios() {
    this.isLoading = true;
    this.errorMessage = '';
    this.usuariosService.getUsuarios().pipe(timeout(15000)).subscribe({
      next: (data) => {
        this.usuarios = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error en cargarUsuarios:', err);
        this.toast.error('No se pudieron cargar los usuarios');
        this.errorMessage = 'No se pudieron cargar los usuarios.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para abrir el modal de creacion de usuario
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

  // Bloque para abrir el modal en modo edicion con los datos del usuario
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
  
  // Bloque para cerrar el modal de usuario
  cerrarModal() { 
    this.showModal = false;
    this.isEditMode = false;
    this.editingUserId = null;
    this.tempPasswordGenerated = ''; 
  }

  // Bloque para decidir si guardar mediante creacion o actualizacion
  guardarUsuario() {
    if (this.isEditMode) {
      this.actualizarUsuario();
    } else {
      this.crearUsuario();
    }
  }

  // Bloque para actualizar los datos de un usuario existente
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

  // Bloque para crear un nuevo usuario y generar credenciales de acceso
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
        this.nuevoUsuarioNombre = this.formData.primer_nombre + ' ' + this.formData.primer_apellido;
        this.emailGenerado = res.email || this.formData.email_personal;
        this.tempPasswordGenerated = res.password || 'T3mp0r4l123*';
        this.cargarUsuarios();
      },
      error: (err) => {
        console.error('Error en crearUsuario:', err);
        this.isSubmitting = false;
        this.toast.error(err.error?.message || 'Error al crear el usuario');
      }
    });
  }

  // Bloque para eliminar permanentemente un usuario
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

  // Bloque para alternar el estado activo/inactivo de un usuario
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
      error: (err) => {
        console.error('Error en cambiarEstado:', err);
        this.toast.error(err.error?.error || 'Error al cambiar el estado del usuario');
      }
    });
  }

  // Bloque para aprobar la baja de un usuario solicitada por el area correspondiente
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

  // Bloque para obtener el nombre del rol a partir del cargo o asignacion directa
  private obtenerNombreRol(u: any): string {
    return u?.empleado?.cargo?.rol?.nombre
      || u?.rol?.nombre
      || 'Pendiente RRHH';
  }

  // Bloque para limpiar el termino de busqueda de usuarios
  limpiarBusqueda() {
    this.searchTerm = '';
  }

  // Bloque para filtrar los usuarios pertenecientes a un rol especifico
  getUsuariosPorRol(nombreRol: string): any[] {
    return this.usuariosFiltrados.filter(u => this.obtenerNombreRol(u) === nombreRol);
  }
}
