import { Component, inject, OnInit } from '@angular/core';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastComponent } from './components/toast/toast.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'frontend';

  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    // Si el usuario navega o retrocede hacia el Landing ('/') o al Login ('/login'),
    // se cierra inmediatamente cualquier sesión activa por seguridad.
    this.verificarCierrePorRutaPublica(window.location.pathname);

    this.router.events
      .pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
      .subscribe((event) => {
        const cleanPath = event.url.split('?')[0].split('#')[0];
        this.verificarCierrePorRutaPublica(cleanPath);
      });
  }

  private verificarCierrePorRutaPublica(path: string): void {
    if ((path === '/' || path === '' || path === '/login' || path.startsWith('/login/')) && this.authService.getToken()) {
      this.authService.logout(false);
    }
  }
}
