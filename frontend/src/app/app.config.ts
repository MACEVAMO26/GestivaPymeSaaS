import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, PreloadingStrategy, Route, withPreloading } from '@angular/router';
import { Observable, of } from 'rxjs';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './services/auth.interceptor';

import { routes } from './app.routes';

// Estrategia de precarga selectiva: descarga en segundo plano los chunks de las
// rutas que el usuario usa primero (saas-admin, dashboard y sus módulos iniciales).
export class RutasClavePreloadingStrategy implements PreloadingStrategy {
  private rutasACargar = [
    '', 'login', 'saas-admin', 'dashboard',
    'inicio', 'administracion', 'gestion-de-tareas', 'gestiva-ia', 'autogestion',
    'gestion-humana', 'finanzas'
  ];

  preload(route: Route, load: () => Observable<any>): Observable<any> {
    const path = route.path ?? '';
    const primerSegmento = path.split('/')[0];
    if (this.rutasACargar.includes(path) || this.rutasACargar.includes(primerSegmento)) {
      return load();
    }
    return of(null);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withPreloading(RutasClavePreloadingStrategy)),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
