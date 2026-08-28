import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteService, Cliente } from '../../../../../services/cliente.service';
import { ToastService } from '../../../../../services/toast.service';
import { timeout } from 'rxjs';
import { CrmGestionDeClientesComponent } from '../../servicios/crm-gestion-de-clientes/crm-gestion-de-clientes.component';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, CrmGestionDeClientesComponent],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss'
})
export class ClientesComponent implements OnInit {
  private clienteService = inject(ClienteService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  // Tabs
  tabActiva: 'directorio' | 'crm' = 'directorio';

  // State (Directorio)
  clientesOriginales: any[] = [];
  clientes: any[] = [];
  searchTerm: string = '';
  tipoFiltro: string = '';
  clienteSeleccionado360: any = null;

  // UI State
  cargando = false;
  showModal = false;
  isEditMode = false;
  isSaving = false;
  clienteActual: any = {};

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

  getDocumentoFormateado(c: any): string {
    if (!c || !c.documento) return '--';
    const doc = c.documento.trim();
    const docLower = doc.toLowerCase();
    if (docLower.startsWith('nit') || docLower.startsWith('cc') || docLower.startsWith('ce') || docLower.startsWith('pas')) {
      return doc;
    }
    const prefix = c.tipo_cliente === 'Juridico' ? 'NIT' : 'CC';
    return `${prefix} ${doc}`;
  }

  ver360(c: any) {
    this.clienteSeleccionado360 = c;
    this.tabActiva = 'crm';
    this.toast.success(`Abriendo Vista 360° de ${this.getNombreCliente(c)}`);
    this.cdr.detectChanges();
  }

  solicitarInactivacion(c: any) {
    if (confirm(`¿Enviar solicitud de inactivación para el cliente ${this.getNombreCliente(c)}?`)) {
      this.toast.success(`Solicitud de inactivación enviada exitosamente.`);
    }
  }

  ngOnInit() {
    this.cargarClientes();
  }

  cargarClientes() {
    this.cargando = true;
    this.clienteService.getClientes().pipe(timeout(15000)).subscribe({
      next: (res) => {
        this.clientesOriginales = res;
        this.clientes = [...this.clientesOriginales];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err?.name === 'TimeoutError') {
          this.toast.error('Tiempo de espera agotado al cargar clientes.');
        }
        this.clientesOriginales = [];
        this.clientes = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  filtrarClientes() {
    let result = this.clientesOriginales;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.nombre && c.nombre.toLowerCase().includes(term)) ||
        (c.documento && c.documento.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.empresa && c.empresa.toLowerCase().includes(term))
      );
    }
    if (this.tipoFiltro) {
      result = result.filter(c => c.tipo_cliente === this.tipoFiltro);
    }
    this.clientes = result;
  }

  // --- LOGICA DIRECTORIO ---

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

  abrirModalEditar(c: any) {
    this.isEditMode = true;
    this.clienteActual = { ...c };
    if (!this.clienteActual.tipo_cliente) {
      this.clienteActual.tipo_cliente = this.clienteActual.nombre_razon_social ? 'Juridico' : 'Natural';
    }
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
    this.clienteActual = {};
  }

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
    const payload: any = { ...this.clienteActual };

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
