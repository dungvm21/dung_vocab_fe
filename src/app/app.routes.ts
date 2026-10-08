import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'decks/:deckId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/deck/deck-detail').then((m) => m.DeckDetail),
  },
  {
    path: 'decks/:deckId/study',
    canActivate: [authGuard],
    loadComponent: () => import('./features/study/study').then((m) => m.Study),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
