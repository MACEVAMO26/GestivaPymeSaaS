import { Component, inject, OnInit } from '@angular/core';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastComponent } from './shared/components/toast/toast.component';
import { SessionWarningModalComponent } from './shared/components/session-warning-modal/session-warning-modal.component';
import { AuthService } from './services/auth.service';
import { SessionTimeoutService } from './services/session-timeout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, SessionWarningModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'frontend';

  private authService = inject(AuthService);
  private sessionTimeoutService = inject(SessionTimeoutService);
  private router = inject(Router);

  // Bloque de inicialización para monitoreo de sesión e inactividad
  ngOnInit() {
    
    this.verificarCierrePorRutaPublica(window.location.pathname);

    this.router.events
      .pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
      .subscribe((event) => {
        const cleanPath = event.url.split('?')[0].split('#')[0];
        this.verificarCierrePorRutaPublica(cleanPath);
        if (this.authService.getToken()) {
          this.sessionTimeoutService.startMonitoring();
        } else {
          this.sessionTimeoutService.stopMonitoring();
        }
      });
  }

  private verificarCierrePorRutaPublica(path: string): void {
    if ((path === '/' || path === '' || path === '/login' || path.startsWith('/login/')) && this.authService.getToken()) {
      this.sessionTimeoutService.stopMonitoring();
      this.authService.logout(false);
    }
  }
}
