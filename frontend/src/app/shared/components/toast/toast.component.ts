import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  // --- VARIABLES DE ESTADO ---
  public toastService = inject(ToastService);
  private authService = inject(AuthService);

  // Bloque para verificar si el usuario pertenece al entorno de cliente
  get esCliente(): boolean {
    const user = this.authService.getUser();
    return !!user?.empresa_id;
  }

  // Bloque para obtener la clase contenedora de la notificación neumórfica
  toastClassNeumorph(type: string): string {
    return 'bg-[#f5f5dc] text-[#1a1a1a]';
  }

  // Bloque para obtener el fondo del icono en variante neumórfica
  iconBgNeumorph(type: string): string {
    switch (type) {
      case 'success': return 'bg-[#066810]';
      case 'error': return 'bg-[#de3737]';
      case 'warning': return 'bg-[#C9A227]';
      default: return 'bg-[#45a1ae]';
    }
  }

  // Bloque para obtener el color del icono en variante neumórfica
  iconColorNeumorph(type: string): string {
    return 'text-white';
  }

  // Bloque para obtener la clase contenedora en variante glass
  toastClassGlass(type: string): string {
    switch (type) {
      case 'success': return 'bg-lime-900/90 border-lime-500/50 text-lime-100';
      case 'error': return 'bg-orange-900/90 border-orange-500/50 text-orange-100';
      case 'warning': return 'bg-amber-900/90 border-amber-500/50 text-amber-100';
      default: return 'bg-indigo-900/90 border-indigo-500/50 text-indigo-100';
    }
  }

  // Bloque para obtener el fondo del icono en variante glass
  iconBgGlass(type: string): string {
    switch (type) {
      case 'success': return 'bg-emerald-500/20';
      case 'error': return 'bg-rose-500/20';
      case 'warning': return 'bg-amber-500/20';
      default: return 'bg-indigo-500/20';
    }
  }

  // Bloque para obtener el color del icono en variante glass
  iconColorGlass(type: string): string {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-rose-400';
      case 'warning': return 'text-amber-400';
      default: return 'text-indigo-400';
    }
  }
}
