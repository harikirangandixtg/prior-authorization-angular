import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** login, signup and password reset are public: no token is sent, and a 401 there is just a wrong password. */
const PUBLIC = /\/auth\/(login|signup|password)$/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isOurApi = req.url.startsWith(environment.apiBaseUrl) || req.url.startsWith(environment.authBaseUrl);
  if (!isOurApi || PUBLIC.test(req.url.split('?')[0])) return next(req);

  const token = auth.token();
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed).pipe(
    tap({
      error: (err) => {
        if (err?.status === 401) auth.expire(router.url);
      },
    }),
  );
};
