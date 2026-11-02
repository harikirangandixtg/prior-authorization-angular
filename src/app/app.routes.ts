import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guards';

export const routes: Routes = [
  // Public pages (signed-in users are sent to the dashboard)
  {
    path: 'login',
    title: 'Sign in · PA Assistant',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    title: 'Create account · PA Assistant',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'reset-password',
    title: 'Reset password · PA Assistant',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },

  // Everything else needs a signed-in user
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard · PA Assistant',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'new',
        title: 'New request · PA Assistant',
        canActivate: [roleGuard('requester')],
        loadComponent: () => import('./features/new-request/new-request.component').then((m) => m.NewRequestComponent),
      },
      {
        path: 'policies',
        title: 'Policy search · PA Assistant',
        loadComponent: () => import('./features/policies/policies.component').then((m) => m.PoliciesComponent),
      },
      {
        path: 'cases',
        title: 'Cases · PA Assistant',
        loadComponent: () => import('./features/cases/cases.component').then((m) => m.CasesComponent),
      },
      {
        path: 'cases/:id',
        title: 'Case · PA Assistant',
        loadComponent: () => import('./features/case-detail/case-detail.component').then((m) => m.CaseDetailComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
