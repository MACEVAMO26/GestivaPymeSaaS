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

  private bubbleTimer: any = null;

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
    if (this.bubbleTimer) {
      clearTimeout(this.bubbleTimer);
    }
  }

  evaluateRoute(url: string) {
    this.showBubble = false;
    // Mantiene el chat abierto si el usuario ya lo abrió expresamente, para no cerrarlo de forma confusa

    if (url.includes('/empleados') || url.includes('/gestion-humana')) {
      this.currentModule = 'empleados';
      if (this.tutorialCounts.empleados < 2) {
        this.triggerBubble('Estás en Gestión Humana. ¿Deseas ayuda para crear contratos o tramitar novedades?');
      }
    } else if (url.includes('/inventario')) {
      this.currentModule = 'inventario';
      if (this.tutorialCounts.inventario < 2) {
        this.triggerBubble('Estás en Inventario. Puedo orientarte sobre cómo ajustar existencias o catalogar productos.');
      }
    } else if (url.includes('/clientes')) {
      this.currentModule = 'clientes';
      if (this.tutorialCounts.clientes < 2) {
        this.triggerBubble('Estás en Clientes. ¿Necesitas registrar un comprador o ver su ficha comercial 360°?');
      }
    } else if (url.includes('/ventas')) {
      this.currentModule = 'ventas';
      if (this.tutorialCounts.ventas < 2) {
        this.triggerBubble('Estás en Ventas. Puedo ayudarte con cotizaciones, facturas o el arqueo de caja.');
      }
    } else {
      this.currentModule = 'general';
    }
  }

  triggerBubble(msg: string) {
    if (this.bubbleTimer) {
      clearTimeout(this.bubbleTimer);
    }
    setTimeout(() => {
      this.bubbleMessage = msg;
      this.showBubble = true;
      this.bubbleTimer = setTimeout(() => {
        this.showBubble = false;
      }, 15000);
    }, 1200);
  }

  abrirChatDesdeBurbuja() {
    if (this.bubbleTimer) {
      clearTimeout(this.bubbleTimer);
    }
    this.showBubble = false;
    this.showChat = true;
  }

  cerrarBurbuja(event: Event) {
    event.stopPropagation();
    if (this.bubbleTimer) {
      clearTimeout(this.bubbleTimer);
    }
    this.showBubble = false;
  }

  toggleChat() {
    this.showChat = !this.showChat;
    if (this.showChat) {
      this.showBubble = false;
      if (this.bubbleTimer) {
        clearTimeout(this.bubbleTimer);
      }
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
    this.showChat = false; // Cierra el mini-chat para permitir ver el tutorial completo en pantalla
    this.iaStateService.triggerTutorial();
  }
}
