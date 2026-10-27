import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

// Bloque para interceptar peticiones HTTP e inyectar cabeceras de autorización
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  let clonedReq = req;
  let headers = req.headers.set('Accept', 'application/json');
  
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  const user = authService.getUser();
  if (user && user.empresa_id) {
    headers = headers.set('X-Empresa-Id', user.empresa_id.toString());
  }

  clonedReq = req.clone({ headers });

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      
      if (error.status === 401 && !req.url.includes('/logout') && !req.url.includes('/login')) {
        authService.clearSessionStorage();
        router.navigate(['/login'], { queryParams: { motivo: 'sesion_remota' }, replaceUrl: true });
      }
      return throwError(() => error);
    })
  );
};
