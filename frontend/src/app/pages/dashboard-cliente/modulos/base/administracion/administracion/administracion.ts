import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { AuthService } from '../../../../../../services/auth.service';

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [RouterOutlet, RouterModule],
  templateUrl: './administracion.html',
  styleUrl: './administracion.scss'
})
export class AdministracionComponent {
  private authService = inject(AuthService);

  get esGerente(): boolean {
    const user = this.authService.getUser();
    return user?.rol?.nombre === 'Gerente General' || user?.rol?.nombre === 'Gerente';
  }
}
