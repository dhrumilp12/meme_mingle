import { Routes } from '@angular/router';
// import { authGuard } from '../shared/guard/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./main.component').then((m) => m.MainComponent),
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () =>
          import('../live-conversation/live-conversation.component').then((m) => m.LiveConversationComponent),
      },
      
      
    ],
  },
];
