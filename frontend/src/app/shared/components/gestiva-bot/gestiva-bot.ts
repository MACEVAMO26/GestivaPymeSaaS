import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter, Subscription } from 'rxjs';
import { IaStateService } from '../../../services/ia-state/ia-state.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-gestiva-bot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestiva-bot.html',
  styleUrls: ['./gestiva-bot.scss']
})
export class GestivaBotComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private http = inject(HttpClient);
  private iaStateService = inject(IaStateService);
  private authService = inject(AuthService);
  private routerSub!: Subscription;

  // Estados visuales
  showBubble = false;
  showChat = false;
  bubbleMessage = '';
  
  // Chat IA
  userMessage = '';
  isAdvancedMode = false;
  isLoading = false;
  chatHistory: {role: string, content: string}[] = [
    { role: 'assistant', content: '¡Hola! Soy Gestiva AI. Selecciona una opción o escribe tu pregunta:' }
  ];
  
  // Status de tutorial
  tutorialCounts: any = {
    empleados: 0,
    productos: 0,
    clientes: 0,
    ventas: 0,
    inventario: 0
  };

  currentModule = '';
  hasChecked = false;

  ngOnInit() {
    // 1. Obtener status de la BD al iniciar
    this.http.get('/api/tutorial-status').subscribe({
      next: (res: any) => {
        this.tutorialCounts = res;
        this.hasChecked = true;
        this.evaluateRoute(this.router.url);
      },
      error: (err) => console.error('Error fetching tutorial status', err)
    });

    // 2. Escuchar cambios de ruta
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (this.hasChecked) {
        this.evaluateRoute(event.urlAfterRedirects);
      }
    });
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  evaluateRoute(url: string) {
    this.showBubble = false;
    this.showChat = false;

    if (url.includes('/empleados')) {
      this.currentModule = 'empleados';
      if (this.tutorialCounts.empleados < 2) {
        this.triggerBubble('¡Hola! Estás en el módulo de Empleados. ¡Haz clic en "Agregar Empleado"!');
      }
    } else if (url.includes('/inventario')) {
      this.currentModule = 'inventario';
      if (this.tutorialCounts.inventario < 2) {
        this.triggerBubble('¡Hola! Bienvenido al Inventario. ¡Comienza creando nuevos ítems!');
      }
    } else if (url.includes('/clientes')) {
      this.currentModule = 'clientes';
      if (this.tutorialCounts.clientes < 2) {
        this.triggerBubble('¡Hola! En la sección de Clientes puedes registrar a tus compradores. ¡Intenta agregar uno nuevo!');
      }
    } else if (url.includes('/ventas')) {
      this.currentModule = 'ventas';
      if (this.tutorialCounts.ventas < 2) {
        this.triggerBubble('¡Hola! El módulo de Ventas te permite registrar cotizaciones. ¡Crea tu primera venta!');
      }
    } else {
      this.currentModule = 'general';
    }
  }

  triggerBubble(msg: string) {
    setTimeout(() => {
      this.bubbleMessage = msg;
      this.showBubble = true;
      setTimeout(() => {
        this.showBubble = false;
      }, 15000);
    }, 1000);
  }

  toggleChat() {
    this.showChat = !this.showChat;
    if (this.showChat) {
      this.showBubble = false;
    }
  }

  closeChat() {
    this.showChat = false;
  }

  sendSuggestion(suggestion: string) {
    this.userMessage = suggestion;
    this.sendMessage();
  }

  sendMessage() {
    if (!this.userMessage.trim()) return;

    const prompt = this.userMessage;
    this.chatHistory.push({ role: 'user', content: prompt });
    this.userMessage = '';
    this.isLoading = true;

    const payload = {
      prompt: prompt,
      modo: this.isAdvancedMode ? 'avanzado' : 'basico',
      empresa_id: this.authService.getUser()?.empresa_id
    };

    this.http.post('/api/ia/procesar-tarea', payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success && res.data?.respuesta) {
          this.chatHistory.push({ role: 'assistant', content: res.data.respuesta });
        } else {
          this.chatHistory.push({ role: 'assistant', content: 'Lo siento, no pude procesar tu solicitud.' });
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error IA:', err);
        this.chatHistory.push({ role: 'assistant', content: 'Error de conexión con el servicio de Inteligencia Artificial.' });
      }
    });
  }

  verTutorial() {
    this.iaStateService.triggerTutorial();
  }
}
