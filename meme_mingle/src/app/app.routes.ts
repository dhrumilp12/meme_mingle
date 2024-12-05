import { Routes } from '@angular/router';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { AboutusComponent } from './layout/aboutus/aboutus.component';
import { FaqComponent } from './layout/faq/faq.component';

export const routes: Routes = [
     {
        path: '',
        redirectTo: 'auth',
        pathMatch: 'full',
      },
      {
        path: 'auth',
        loadChildren: () => import('./auth/auth.routes').then((m) => m.routes),
  },
  {
    path: 'main',
    loadChildren: () => import('./main/main.routes').then((m) => m.main_routes),
      },
  //     {
  //       path: 'user-profile',
  //       loadComponent: () =>
  //         import('./user-profile/user-profile.component').then((m) => UserProfileComponent),
  //    },
  //    {
  //   path: 'about',
  //   loadComponent: () =>
  //     import('./layout/aboutus/aboutus.component').then((m) => AboutusComponent),
  //   },
  //   {
  //     path: 'contact',
  //     loadComponent: () =>
  //       import('./layout/contact/contact.component').then((m) => m.ContactComponent),
  //   },
  // {
  //   path: 'FAQ',
  //   loadComponent: () =>
  //     import('./layout/faq/faq.component').then((m) => FaqComponent),
  // },
  // {
  //   path: 'home',
  //   loadComponent: () =>
  //     import('./live-conversation/live-conversation.component').then((m) => m.LiveConversationComponent),
  // },
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
