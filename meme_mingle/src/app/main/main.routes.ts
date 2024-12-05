import { Routes } from '@angular/router';
// import { authGuard } from '../shared/guard/auth.guard';

export const main_routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./main.component').then((m) => m.MainComponent),
    children: [
      {
        path: '',
        redirectTo: 'live-conversion',
        pathMatch: 'full',
      },
      {
        path: 'live-conversion',
        loadComponent: () =>
          import('./live-conversation/live-conversation.component').then((m) => m.LiveConversationComponent),
      },
      
      
    ],
  },
];
