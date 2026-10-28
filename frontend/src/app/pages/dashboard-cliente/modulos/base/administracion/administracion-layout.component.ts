import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { AuthService } from '../../../../../services/auth.service';

@Component({
  selector: 'app-administracion-layout',
  standalone: true,
  imports: [RouterOutlet, RouterModule],
  templateUrl: './administracion-layout.component.html',
  styleUrl: './administracion-layout.component.scss'
})
export class AdministracionLayoutComponent {
  // --- INYECCIÓN DE DEPENDENCIAS Y SERVICIOS ---
  private authService = inject(AuthService);

  // Bloque getter para validar si el usuario autenticado tiene rol de Gerente
  get esGerente(): boolean {
    const user = this.authService.getUser();
    return user?.rol?.nombre === 'Gerente General' || user?.rol?.nombre === 'Gerente';
  }
}
