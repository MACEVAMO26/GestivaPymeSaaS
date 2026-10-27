import { Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SessionTimeoutService {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);

  // --- CONSTANTES Y CONFIGURACION DE TIEMPO ---
  private readonly MAX_INACTIVITY_MS = 60 * 60 * 1000;
  private readonly WARNING_TIME_MS = 55 * 60 * 1000;
  private readonly ACTIVITY_THROTTLE_MS = 15 * 1000;
  private readonly CHECK_INTERVAL_MS = 5 * 1000;

  private readonly STORAGE_KEY = 'gestiva_last_activity';
  private readonly BROADCAST_CHANNEL_NAME = 'gestiva_auth_sync';

  private checkIntervalId: any = null;
  private lastRecordedTime = 0;
  private authChannel: BroadcastChannel | null = null;
  private isTracking = false;

  // --- ESTADOS OBSERVABLES ---
  public showWarning$ = new BehaviorSubject<boolean>(false);
  public secondsRemaining$ = new BehaviorSubject<number>(300);

  constructor() {
    this.initBroadcastChannel();
    this.initStorageListener();
  }

  // Bloque para iniciar monitoreo de inactividad
  startMonitoring(): void {
    if (this.isTracking || typeof window === 'undefined') return;
    this.isTracking = true;

    this.recordActivity();

    this.ngZone.runOutsideAngular(() => {
      const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
      events.forEach(eventName => {
        window.addEventListener(eventName, this.onUserActivity, { passive: true });
      });

      this.checkIntervalId = setInterval(() => {
        this.checkInactivity();
      }, this.CHECK_INTERVAL_MS);
    });
  }

  // Bloque para detener monitoreo de inactividad
  stopMonitoring(): void {
    if (!this.isTracking || typeof window === 'undefined') return;
    this.isTracking = false;

    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(eventName => {
      window.removeEventListener(eventName, this.onUserActivity);
    });

    this.ngZone.run(() => {
      this.showWarning$.next(false);
    });
  }

  // Bloque para escuchar eventos globales del usuario
  private onUserActivity = (): void => {
    this.recordActivity(false);
  };

  // Bloque para registrar la actividad del usuario
  private recordActivity(force: boolean = false): void {
    const now = Date.now();
    if (!force && (now - this.lastRecordedTime) < this.ACTIVITY_THROTTLE_MS) {
      return;
    }

    this.lastRecordedTime = now;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, now.toString());
      } catch (e) {}
    }

    if (this.showWarning$.value) {
      this.ngZone.run(() => {
        this.showWarning$.next(false);
      });
      this.broadcastMessage({ type: 'ACTIVITY_RESUMED', timestamp: now });
    }
  }

  // Bloque para comprobar el tiempo transcurrido de inactividad
  private checkInactivity(): void {
    if (!this.authService.getToken()) {
      this.stopMonitoring();
      return;
    }

    let lastActivity = this.lastRecordedTime;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          lastActivity = Math.max(lastActivity, parseInt(stored, 10));
        }
      } catch (e) {}
    }

    if (!lastActivity) {
      this.recordActivity(true);
      return;
    }

    const elapsed = Date.now() - lastActivity;

    if (elapsed >= this.MAX_INACTIVITY_MS) {
      this.ngZone.run(() => {
        this.performInactivityLogout();
      });
    } else if (elapsed >= this.WARNING_TIME_MS) {
      const remainingMs = this.MAX_INACTIVITY_MS - elapsed;
      const remainingSecs = Math.max(1, Math.round(remainingMs / 1000));
      this.ngZone.run(() => {
        this.secondsRemaining$.next(remainingSecs);
        if (!this.showWarning$.value) {
          this.showWarning$.next(true);
        }
      });
    } else {
      if (this.showWarning$.value) {
        this.ngZone.run(() => {
          this.showWarning$.next(false);
        });
      }
    }
  }

  // Bloque para ejecutar el cierre de sesión por inactividad
  private performInactivityLogout(): void {
    this.stopMonitoring();
    this.broadcastMessage({ type: 'INACTIVITY_LOGOUT', timestamp: Date.now() });
    this.authService.clearSessionStorage();
    this.toastService.error('Tu sesión ha expirado por inactividad (1 hora sin movimiento).');
    this.router.navigate(['/login'], { queryParams: { motivo: 'inactividad' }, replaceUrl: true });
  }

  // Bloque para sincronizar actividad entre pestañas
  private initStorageListener(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (event) => {
      if (event.key === this.STORAGE_KEY && event.newValue) {
        const otherTabActivity = parseInt(event.newValue, 10);
        if (otherTabActivity > this.lastRecordedTime) {
          this.lastRecordedTime = otherTabActivity;
          if (this.showWarning$.value) {
            this.ngZone.run(() => {
              this.showWarning$.next(false);
            });
          }
        }
      }
    });
  }

  // Bloque para inicializar canal de difusión de sincronización
  private initBroadcastChannel(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.authChannel = new BroadcastChannel(this.BROADCAST_CHANNEL_NAME);
        this.authChannel.onmessage = (event) => {
          if (event.data?.type === 'INACTIVITY_LOGOUT' && this.authService.getToken()) {
            this.stopMonitoring();
            this.authService.clearSessionStorage();
            this.toastService.error('Tu sesión ha expirado por inactividad (1 hora sin movimiento).');
            this.router.navigate(['/login'], { queryParams: { motivo: 'inactividad' }, replaceUrl: true });
          } else if (event.data?.type === 'ACTIVITY_RESUMED') {
            if (this.showWarning$.value) {
              this.ngZone.run(() => {
                this.showWarning$.next(false);
              });
            }
          }
        };
      } catch (e) {}
    }
  }

  private broadcastMessage(message: any): void {
    if (this.authChannel) {
      try {
        this.authChannel.postMessage(message);
      } catch (e) {}
    }
  }

  // Bloque para mantener la sesión activa a solicitud del usuario
  keepSessionAlive(): void {
    this.recordActivity(true);
    this.showWarning$.next(false);
    this.toastService.success('Sesión prolongada con éxito.');
  }

  // Bloque para confirmar el cierre voluntario de sesión
  logoutNow(): void {
    this.stopMonitoring();
    this.authService.logout(true);
  }
}
