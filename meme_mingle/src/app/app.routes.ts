import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'auth',
        pathMatch: 'full',
      },
      // {
      //   path: '',
      //   loadChildren: () => import('./main/main.routes').then((m) => m.routes),
      // },
      {
        path: 'auth',
        loadChildren: () => import('./auth/auth.routes').then((m) => m.routes),
      },
      {
        path: 'user-profile',
        loadChildren: () =>
          import('./user-profile/user-profile.routes').then((m) => m.routes),
      },
      {
        path: '**',
        redirectTo: 'error',
        pathMatch: 'full',
      },
      {
        path: 'error',
        loadComponent: () =>
          import('./shared/components/error/error.component').then(
            (m) => m.ErrorComponent
          ),
      },
];
