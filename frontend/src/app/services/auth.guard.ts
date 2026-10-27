import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Bloque para validar autenticación y control de acceso en rutas protegidas
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getToken()) {
    return true;
  } else {
    router.navigate(['/login'], { replaceUrl: true });
    return false;
  }
};
