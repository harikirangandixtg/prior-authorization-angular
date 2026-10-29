import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Dashboard · PA Assistant',
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'new',
    title: 'New request · PA Assistant',
    loadComponent: () => import('./features/new-request/new-request.component').then((m) => m.NewRequestComponent),
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
  {
    path: 'policies',
    title: 'Policy search · PA Assistant',
    loadComponent: () => import('./features/policies/policies.component').then((m) => m.PoliciesComponent),
  },
  { path: '**', redirectTo: '' },
];
