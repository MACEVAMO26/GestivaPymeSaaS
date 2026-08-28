import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  let clonedReq = req;
  let headers = req.headers;
  
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
      // Si el servidor responde que no estamos autorizados (token inválido/vencido o DB reiniciada)
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
