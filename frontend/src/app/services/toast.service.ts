import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<ToastMessage[]>([]);
  private idCounter = 0;

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', durationMs: number = 4000) {
    // Evitar toasts duplicados idénticos visibles simultáneamente
    if (this.toasts().some(t => t.message === message && t.type === type)) {
      return;
    }

    const id = this.idCounter++;
    this.toasts.update(t => {
      const updated = [...t, { id, message, type }];
      return updated.length > 3 ? updated.slice(updated.length - 3) : updated;
    });

    setTimeout(() => {
      this.remove(id);
    }, durationMs);
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  warning(message: string) {
    this.show(message, 'warning');
  }

  info(message: string) {
    this.show(message, 'info');
  }

  // Bloque para remover una notificación toast por su ID
  remove(id: number) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
