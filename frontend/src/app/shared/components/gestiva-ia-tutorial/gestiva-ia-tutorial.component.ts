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
    this.generarPasos();
    
    // La guía se muestra de forma controlada cuando el usuario la solicita voluntariamente
    this.mostrar = false;

    this.sub = this.iaStateService.showTutorial$.subscribe(() => {
      this.generarPasos();
      this.pasoActual = 0;
      this.mostrar = true;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['modulos']) {
      this.generarPasos();
    }
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  generarPasos() {
    this.pasos = [];
    this.pasos.push({
      title: '¡Hola! Te damos la bienvenida a GestivaPyme',
      description: 'Soy Gestiva AI, tu asistente inteligente empresarial. Esta plataforma reúne en un solo lugar la administración, las ventas, los inventarios, los servicios y la gestión de talento de tu empresa.'
    });

    const descripciones: {[key: string]: string} = {
      'd_ini': 'Panel Resumen: Visión global y métricas clave de tu operación al instante.',
      'd_adm': 'Administración y Usuarios: Configuración institucional de la empresa y gestión de accesos.',
      'd_tar': 'Gestión de Tareas: Asigna actividades a tu equipo, establece prioridades y haz seguimiento oportuno.',
      'd_gia': 'Gestiva IA Estratégica: Entrena reglas de negocio y parámetros de atención para tu equipo.',
      'rrhh': 'Gestión Humana: Expedientes de empleados, contratos, vacaciones y novedades laborales.',
      'v_prov': 'Proveedores: Directorio comercial y cuentas por pagar organizadas.',
      'v_rep': 'Compras: Gestión de abastecimiento, órdenes de compra y control de pedidos.',
      'v_inv': 'Inventario: Catálogo de productos, control de existencias, ajustes y movimientos de almacén.',
      'v_pos': 'Ventas y POS: Facturación ágil, punto de venta y cierre de caja en tiempo real.',
      'v_cxc': 'Clientes y Cartera: Gestión de compradores, seguimiento comercial y cuentas por cobrar.',
      's_age': 'Agenda y Citas: Programación de servicios técnicos y visitas a clientes.',
      's_crm': 'CRM de Servicios: Seguimiento a oportunidades, solicitudes de servicio y atención.',
      's_cat': 'Catálogo de Servicios: Definición de prestaciones, duraciones estimadas y tarifas.',
      's_ope': 'Operarios y Técnicos: Asignación de servicios de campo y métricas de rendimiento.',
      's_rep': 'Reportes de Servicios: Informes detallados de ejecución y calidad del servicio.',
      'finanzas': 'Finanzas y Caja: Flujo de caja, arqueos diarios, balances y proyecciones.',
      'd_aut': 'Portal de Autogestión: Espacio personal para que cada colaborador revise sus novedades y solicitudes.',
      'addons': 'Módulos y Conectores: Herramientas adicionales para expandir tu suscripción.'
    };

    if (this.modulos && this.modulos.length > 0) {
      this.modulos.forEach(modulo => {
        if (descripciones[modulo.id]) {
          this.pasos.push({
            title: modulo.nombre,
            description: descripciones[modulo.id]
          });
        }
      });
    } else {
      // Pasos base garantizados si la lista de módulos aún está cargando
      this.pasos.push({
        title: 'Menú Lateral Adaptativo',
        description: 'En el panel izquierdo encontrarás todos los módulos contratados por tu empresa, desde ventas y facturación hasta inventario y recursos humanos.'
      });
      this.pasos.push({
        title: 'Asistente Gestiva AI',
        description: 'En la esquina inferior derecha encontrarás siempre mi botón flotante para resolver dudas, generar reportes o sugerir mejoras para tu operación.'
      });
    }

    this.pasos.push({
      title: '¡Todo listo para empezar!',
      description: 'Puedes volver a abrir esta guía interactiva en cualquier momento desde el asistente Gestiva AI en la esquina inferior derecha. ¡Muchos éxitos en tu gestión!'
    });
  }

  anterior() {
    if (this.pasoActual > 0) {
      this.pasoActual--;
    }
  }

  siguiente() {
    if (this.pasoActual < this.pasos.length - 1) {
      this.pasoActual++;
    } else {
      this.finalizarTutorial();
    }
  }

  irAPaso(index: number) {
    if (index >= 0 && index < this.pasos.length) {
      this.pasoActual = index;
    }
  }

  cerrarTutorial() {
    this.mostrar = false;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('tutorial_visto_sesion', 'true');
    }
  }

  finalizarTutorial() {
    this.mostrar = false;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('tutorial_visto_sesion', 'true');
    }
    this.http.post('/api/usuarios/tutorial-visto', {}).subscribe({
      next: () => {
        if (this.user) {
          this.user.tutorial_ia_visto = 1;
          this.authService.setUser(this.user);
        }
      },
      error: (err) => {
        console.error('Error al guardar estado del tutorial', err);
      }
    });
  }
}

