import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  
  // Inyectamos nuestros servicios necesarios
  const authService = inject(AuthService);
  const router = inject(Router);

  // La lógica de decisión del portero
  if (authService.getToken()) {
    // Si existe un token en el sessionStorage, el usuario puede pasar.
    const token = sessionStorage.getItem('auth_token');
    return true;
  } else {
    // Si NO existe un token, lo redirigimos a la página de login.
    router.navigate(['/login']);
    // Y le negamos el acceso a la ruta que intentaba visitar.
    return false;
  }
};
