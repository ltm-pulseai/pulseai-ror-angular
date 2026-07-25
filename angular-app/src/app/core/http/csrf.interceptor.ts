import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CsrfService } from './csrf.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const csrf = inject(CsrfService);
  let cloned = req.clone({ withCredentials: true });

  if (MUTATING_METHODS.has(req.method) && csrf.token()) {
    cloned = cloned.clone({ setHeaders: { 'X-CSRF-Token': csrf.token()! } });
  }

  return next(cloned);
};
