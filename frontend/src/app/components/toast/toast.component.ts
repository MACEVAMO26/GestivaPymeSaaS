import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        @if (esCliente) {
          <!-- VARIANTE NEUMÓRFICA (Dashboard Cliente) -->
          <div 
            class="pointer-events-auto transform transition-all duration-300 ease-out translate-y-0 opacity-100 flex items-center gap-3 min-w-[300px] max-w-sm p-4 rounded-2xl"
            [ngClass]="toastClassNeumorph(toast.type)"
          >
            <div class="flex-shrink-0 p-2 rounded-full" [ngClass]="iconBgNeumorph(toast.type)">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" [class]="iconColorNeumorph(toast.type)">
                @if (toast.type === 'success') {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                } @else if (toast.type === 'error') {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                } @else if (toast.type === 'warning') {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                }
              </svg>
            </div>

            <div class="flex-1">
              <p class="text-sm font-medium" style="font-family: 'Montserrat', sans-serif;">{{ toast.message }}</p>
            </div>

            <button (click)="toastService.remove(toast.id)" class="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        } @else {
          <!-- VARIANTE GLASS (SAAS Admin / Landing) -->
          <div 
            class="pointer-events-auto transform transition-all duration-300 ease-out translate-y-0 opacity-100 flex items-center gap-3 min-w-[300px] max-w-sm p-4 rounded-xl shadow-2xl border"
            [ngClass]="toastClassGlass(toast.type)"
          >
            <div class="flex-shrink-0 p-2 rounded-full" [ngClass]="iconBgGlass(toast.type)">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" [class]="iconColorGlass(toast.type)">
                @if (toast.type === 'success') {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                } @else if (toast.type === 'error') {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                } @else if (toast.type === 'warning') {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                }
              </svg>
            </div>

            <div class="flex-1">
              <p class="text-sm font-medium">{{ toast.message }}</p>
            </div>

            <button (click)="toastService.remove(toast.id)" class="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        }
      }
    </div>
  `
})
export class ToastComponent {
  public toastService = inject(ToastService);
  private authService = inject(AuthService);

  // Cliente = usuario con empresa asignada; SAAS admin no tiene empresa_id
  get esCliente(): boolean {
    const user = this.authService.getUser();
    return !!user?.empresa_id;
  }

  toastClassNeumorph(type: string): string {
    return 'bg-[#f5f5dc] text-[#1a1a1a]';
  }

  iconBgNeumorph(type: string): string {
    switch (type) {
      case 'success': return 'bg-[#066810]';
      case 'error': return 'bg-[#de3737]';
      case 'warning': return 'bg-[#C9A227]';
      default: return 'bg-[#45a1ae]';
    }
  }

  iconColorNeumorph(type: string): string {
    return 'text-white';
  }

  toastClassGlass(type: string): string {
    switch (type) {
      case 'success': return 'bg-lime-900/90 border-lime-500/50 text-lime-100';
      case 'error': return 'bg-orange-900/90 border-orange-500/50 text-orange-100';
      case 'warning': return 'bg-amber-900/90 border-amber-500/50 text-amber-100';
      default: return 'bg-indigo-900/90 border-indigo-500/50 text-indigo-100';
    }
  }

  iconBgGlass(type: string): string {
    switch (type) {
      case 'success': return 'bg-emerald-500/20';
      case 'error': return 'bg-rose-500/20';
      case 'warning': return 'bg-amber-500/20';
      default: return 'bg-indigo-500/20';
    }
  }

  iconColorGlass(type: string): string {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-rose-400';
      case 'warning': return 'text-amber-400';
      default: return 'text-indigo-400';
    }
  }
}