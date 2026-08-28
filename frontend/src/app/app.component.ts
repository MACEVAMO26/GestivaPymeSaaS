import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
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
    // Aterrizaje Forzoso en el Dashboard al cargar la aplicación si hay sesión.
    if (this.authService.getToken()) {
      const currentUrl = window.location.pathname;
      const user = this.authService.getUser();
      
      if (user && (currentUrl === '/' || currentUrl === '/login')) {
        if (user.empresa_id === null) {
          this.router.navigate(['/saas-admin']);
        } else {
          let ruta = '/inicio';
          if (user.empresa) {
            if (user.empresa.dominio) {
              ruta = '/' + user.empresa.dominio + '/inicio';
            } else if (user.empresa.razon_social) {
              const slug = user.empresa.razon_social.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
              ruta = '/' + slug + '/inicio';
            }
          }
          this.router.navigate([ruta]);
        }
      }
    }
  }
}
