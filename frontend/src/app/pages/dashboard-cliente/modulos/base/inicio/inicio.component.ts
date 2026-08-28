import { Component } from '@angular/core';
import { InicioResumenComponent } from './inicio-resumen/inicio-resumen.component';
import { InicioRecordatoriosComponent } from './inicio-recordatorios/inicio-recordatorios.component';
import { InicioNotificacionesComponent } from './inicio-notificaciones/inicio-notificaciones.component';
import { InicioReunionesComponent } from './inicio-reuniones/inicio-reuniones.component';
import { InicioCalendarioComponent } from './inicio-calendario/inicio-calendario.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    InicioResumenComponent,
    InicioRecordatoriosComponent,
    InicioNotificacionesComponent,
    InicioReunionesComponent,
    InicioCalendarioComponent
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss'
})
export class InicioComponent {}
