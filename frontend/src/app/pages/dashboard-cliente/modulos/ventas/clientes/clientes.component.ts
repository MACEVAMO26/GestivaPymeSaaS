import { VolverDirective } from '../../../../../shared/directives/volver.directive';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteService, Cliente } from '../../../../../services/cliente.service';
import { ToastService } from '../../../../../services/toast.service';
import { timeout } from 'rxjs';
import { CrmGestionDeClientesComponent } from '../../servicios/crm-gestion-de-clientes/crm-gestion-de-clientes.component';
import { SolicitudInactivacionComponent } from '../../../../../shared/components/solicitud-inactivacion/solicitud-inactivacion.component';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, CrmGestionDeClientesComponent, SolicitudInactivacionComponent, VolverDirective],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss'
})
export class ClientesComponent implements OnInit {
  private clienteService = inject(ClienteService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  tabActiva: 'directorio' | 'crm' = 'directorio';
  clientesOriginales: any[] = [];
  clientes: any[] = [];
  searchTerm: string = '';
  tipoFiltro: string = '';
  clienteSeleccionado360: any = null;
  cargando = false;
  showModal = false;
  isEditMode = false;
  isSaving = false;
  clienteActual: any = {};

  pageSize = 8;
  pageClientes = 1;

  // --- GETTERS Y PAGINACION ---
  get paginatedClientes(): any[] {
    const start = (this.pageClientes - 1) * this.pageSize;
    return this.clientes.slice(start, start + this.pageSize);
  }

  get totalPagesClientes(): number {
    return Math.ceil(this.clientes.length / this.pageSize) || 1;
  }

  // Bloque utilitario para resolver el nombre o razón social del cliente
  getNombreCliente(c: any): string {
    if (!c) return '--';
    if (c.nombre_razon_social && c.nombre_razon_social.trim()) {
      return c.nombre_razon_social.trim();
    }
    const nombres = c.nombres && c.nombres !== 'null' ? c.nombres.trim() : '';
    const apellidos = c.apellidos && c.apellidos !== 'null' ? c.apellidos.trim() : '';
    const completo = `${nombres} ${apellidos}`.trim();
    if (completo.length > 0) return completo;
    return c.email || '--';
  }

  // Bloque utilitario para formatear el tipo y número de documento
  getDocumentoFormateado(c: any): string {
    const docVal = c?.documento || c?.numero_documento || '';
    if (!docVal) return '--';
    const doc = String(docVal).trim();
    const docLower = doc.toLowerCase();
    if (docLower.startsWith('nit') || docLower.startsWith('cc') || docLower.startsWith('ce') || docLower.startsWith('pas')) {
      return doc;
    }
    const prefix = c.tipo_cliente === 'Juridico' ? 'NIT' : 'CC';
    return `${prefix} ${doc}`;
  }

  // Bloque para proyectar la vista integral 360 del cliente
  ver360(c: any) {
    this.clienteSeleccionado360 = c;
    this.tabActiva = 'crm';
    this.toast.success(`Abriendo Vista 360° de ${this.getNombreCliente(c)}`);
    this.cdr.detectChanges();
  }

  // Bloque para iniciar la solicitud de inactivación del cliente
  solicitarInactivacion(c: any) {
    if (confirm(`¿Enviar solicitud de inactivación para el cliente ${this.getNombreCliente(c)}?`)) {
      this.toast.success(`Solicitud de inactivación enviada exitosamente.`);
    }
  }

  // Bloque de ciclo de vida OnInit para cargar el directorio de clientes
  ngOnInit() {
    this.cargarClientes();
  }

  cargarClientes() {
    this.cargando = true;
    this.clienteService.getClientes().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.clientesOriginales = Array.isArray(res) ? res : [];
        this.filtrarClientes();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error cargando clientes:', err);
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado al cargar clientes.');
        } else {
          this.toast.error('No se pudo cargar la lista de clientes desde el servidor.');
        }
        this.clientesOriginales = [];
        this.clientes = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bloque para filtrar clientes por término de búsqueda y tipo
  filtrarClientes() {
    this.pageClientes = 1;
    let result = [...this.clientesOriginales];
    if (this.searchTerm && this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(c => {
        const nombre = this.getNombreCliente(c).toLowerCase();
        const doc = ((c.documento || c.numero_documento) || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const tel = (c.telefono || '').toLowerCase();
        const ciudad = (c.ciudad || '').toLowerCase();
        return nombre.includes(term) || doc.includes(term) || email.includes(term) || tel.includes(term) || ciudad.includes(term);
      });
    }
    if (this.tipoFiltro) {
      const filtro = this.tipoFiltro.toLowerCase();
      result = result.filter(c => {
        const tipo = (c.tipo_cliente || 'Natural').toLowerCase();
        if (filtro === 'natural' || filtro === 'particular') {
          return tipo === 'natural' || tipo === 'particular';
        }
        if (filtro === 'juridico' || filtro === 'empresa') {
          return tipo === 'juridico' || tipo === 'empresa';
        }
        return tipo === filtro;
      });
    }
    this.clientes = result;
    this.cdr.detectChanges();
  }

  // --- SECCION LOGICA DIRECTORIO ---

  // Bloque para preparar y abrir el formulario de creación de cliente
  abrirModalNuevo() {
    this.isEditMode = false;
    this.clienteActual = {
      tipo_cliente: 'Natural',
      nombres: '',
      apellidos: '',
      nombre_razon_social: '',
      documento: '',
      telefono: '',
      email: '',
      direccion: '',
      ciudad: '',
      activo: 1
    };
    this.showModal = true;
  }

  // Bloque para cargar los datos del cliente y abrir el formulario de edición
  abrirModalEditar(c: any) {
    this.isEditMode = true;
    this.clienteActual = { ...c };
    if (!this.clienteActual.documento && this.clienteActual.numero_documento) {
      this.clienteActual.documento = this.clienteActual.numero_documento;
    }
    if (!this.clienteActual.tipo_cliente) {
      this.clienteActual.tipo_cliente = this.clienteActual.nombre_razon_social ? 'Juridico' : 'Natural';
    }
    this.showModal = true;
  }

  // Bloque para cerrar el modal de formulario de cliente
  cerrarModal() {
    this.showModal = false;
    this.clienteActual = {};
  }

  // Bloque para validar y persistir los datos del cliente en el backend
  guardarCliente() {
    const esJuridico = this.clienteActual.tipo_cliente === 'Juridico';
    const nombreValido = esJuridico ? this.clienteActual.nombre_razon_social : this.clienteActual.nombres;

    if (!nombreValido || !this.clienteActual.documento) {
      this.toast.warning('Complete los campos obligatorios (*)');
      return;
    }

    if (esJuridico) {
      this.clienteActual.nombres = this.clienteActual.nombre_razon_social;
    }

    this.isSaving = true;
    const payload: any = { ...this.clienteActual, numero_documento: this.clienteActual.documento };

    if (this.isEditMode && this.clienteActual.id) {
      this.clienteService.actualizarCliente(this.clienteActual.id, payload).pipe(timeout(10000)).subscribe({
        next: () => {
          this.toast.success('Cliente actualizado');
          this.cargarClientes();
          this.cerrarModal();
          this.isSaving = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.toast.error('Error al actualizar');
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.clienteService.crearCliente(payload).pipe(timeout(10000)).subscribe({
        next: () => {
          this.toast.success('Cliente registrado');
          this.cargarClientes();
          this.cerrarModal();
          this.isSaving = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.toast.error('Error al crear el cliente');
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

}
