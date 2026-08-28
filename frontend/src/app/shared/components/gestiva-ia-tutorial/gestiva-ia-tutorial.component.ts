import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { IaStateService } from '../../../services/ia-state/ia-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-gestiva-ia-tutorial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestiva-ia-tutorial.html',
  styleUrl: './gestiva-ia-tutorial.scss'
})
export class GestivaIaTutorialComponent implements OnInit, OnDestroy, OnChanges {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private iaStateService = inject(IaStateService);

  @Input() modulos: any[] = [];

  mostrar = false;
  pasos: {title: string, description: string}[] = [];
  pasoActual = 0;
  user: any;
  private sub?: Subscription;

  ngOnInit() {
    this.user = this.authService.getUser();
    
    if (this.user && this.user.tutorial_ia_visto === 0) {
      this.mostrar = true;
    }

    this.sub = this.iaStateService.showTutorial$.subscribe(() => {
      this.pasoActual = 0;
      this.mostrar = true;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['modulos'] && this.modulos) {
      this.generarPasos();
    }
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  private generarPasos() {
    this.pasos = [];
    this.pasos.push({
      title: 'Â¡Hola! Soy Gestiva',
      description: 'Tu inteligencia artificial personal. Estoy aquí para ayudarte a configurar y sacar el máximo provecho de tu nueva plataforma. Vamos a repasar brevemente los módulos que tienes activos.'
    });

    const descripciones: {[key: string]: string} = {
      'd_ini': 'Aquí tendrás una vista resumida de lo que pasa en tu negocio al instante.',
      'd_adm': 'El corazón de tu empresa. Aquí configuras datos base, sucursales y usuarios.',
      'd_tar': 'Asigna actividades a tu equipo, establece fechas y no pierdas rastro de nada.',
      'd_gia': 'Aquí como gerente puedes enseñarme reglas y sugerencias para transmitirlas a tu equipo.',
      'rrhh': 'Control total sobre tus empleados, sus accesos, nóminas, vacaciones y ausencias.',
      'v_prov': 'Registra a tus proveedores para tener su contacto siempre a mano.',
      'v_rep': 'Lleva registro de las compras y abastecimiento para mantener el inventario al día.',
      'v_inv': 'Controla tus productos, stock disponible, costos y márgenes de ganancia.',
      'v_pos': 'Factura rápidamente, genera cotizaciones y cierra ventas como todo un profesional.',
      'v_cxc': 'Gestiona la relación comercial, cartera de clientes y cuentas por cobrar.',
      's_age': 'Lleva el calendario de servicios agendados para no cruzar citas.',
      's_crm': 'Sigue cada oportunidad de servicio y mantén felices a tus clientes.',
      's_cat': 'Define qué servicios ofreces, sus duraciones y costos base.',
      's_ope': 'Asigna técnicos u Operativos a cada servicio y mide su rendimiento.',
      's_rep': 'Reportes detallados de la prestación de servicios para tomar mejores decisiones.',
      'finanzas': 'Tu panel de control económico: cuentas, ingresos, egresos y proyecciones.',
      'd_aut': 'Para que cada empleado pueda ver su propio rendimiento y reportes personales.',
      'addons': 'Nuevas herramientas extra que puedes añadir a tu plataforma.'
    };

    this.modulos.forEach(modulo => {
      if (descripciones[modulo.id]) {
        this.pasos.push({
          title: modulo.nombre,
          description: descripciones[modulo.id]
        });
      }
    });

    this.pasos.push({
      title: 'Â¡Todo listo para empezar!',
      description: 'A medida que uses la plataforma, estaré analizando métricas en segundo plano. Me verás ocasionalmente por aquí dándote sugerencias.'
    });
  }

  siguiente() {
    if (this.pasoActual < this.pasos.length - 1) {
      this.pasoActual++;
    } else {
      this.finalizarTutorial();
    }
  }

  finalizarTutorial() {
    this.http.post('/api/usuarios/tutorial-visto', {}).subscribe({
      next: () => {
        this.mostrar = false;
        if (this.user) {
          this.user.tutorial_ia_visto = 1;
          this.authService.setUser(this.user);
        }
      },
      error: (err) => {
        console.error('Error al guardar estado del tutorial', err);
        this.mostrar = false;
      }
    });
  }
}

