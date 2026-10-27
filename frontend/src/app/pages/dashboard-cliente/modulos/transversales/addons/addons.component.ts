import { VolverDirective } from '../../../../../shared/directives/volver.directive';
import { Component } from '@angular/core';

// --- COMPONENTE DE INTEGRACIONES Y ADDONS ---
@Component({
  selector: 'app-addons',
  standalone: true,
  imports: [VolverDirective],
  templateUrl: './addons.component.html',
  styleUrl: './addons.component.scss'
})
export class AddonsComponent {
  // --- VARIABLES DE ESTADO ---
}
