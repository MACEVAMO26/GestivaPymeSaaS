import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, PreloadingStrategy, Route, withPreloading } from '@angular/router';
import { Observable, of } from 'rxjs';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './services/auth.interceptor';

import { routes } from './app.routes';

// Estrategia de precarga acelerada: descarga en segundo plano todos los módulos del aplicativo
// después de que la pantalla inicial se ha dibujado, haciendo que la navegación por el menú lateral sea 100% instantánea.
export class RutasClavePreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    const path = route.path ?? '';
    // Excluir rutas comodín
    if (path === ':modulo' || path === '**') {
      return of(null);
    }
    // Si la ruta tiene componente perezoso (loadComponent), precargarla en segundo plano
    if (route.loadComponent) {
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
