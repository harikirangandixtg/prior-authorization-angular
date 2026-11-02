import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';
import { ToastService } from '../shared/toast.service';

/** Signed-in users only. Others go to /login and come back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() || inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Login, signup and reset pages: signed-in users are sent to the dashboard. */
export const guestGuard: CanActivateFn = () => {
  return !inject(AuthService).isLoggedIn() || inject(Router).createUrlTree(['/']);
};

/** Pages that need a specific role. */
export const roleGuard =
  (role: Role): CanActivateFn =>
  () => {
    if (inject(AuthService).can(role)) return true;
    inject(ToastService).error(`You need the ${role} role to open that page.`);
    return inject(Router).createUrlTree(['/']);
  };
