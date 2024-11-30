import { Routes } from '@angular/router';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { AboutusComponent } from './layout/aboutus/aboutus.component';
import { ContactComponent } from './layout/contact/contact.component';
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
        path: 'user-profile',
        loadComponent: () =>
          import('./user-profile/user-profile.component').then((m) => UserProfileComponent),
  },
  {
    path: 'AboutUs',
    loadComponent: () =>
      import('./layout/aboutus/aboutus.component').then((m) => AboutusComponent),
  },
  {
    path: 'Contact',
    loadComponent: () =>
      import('./layout/contact/contact.component').then((m) => ContactComponent),
  },
  {
    path: 'FAQ',
    loadComponent: () =>
      import('./layout/faq/faq.component').then((m) => FaqComponent),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./live-conversation/live-conversation.component').then((m) => m.LiveConversationComponent),
  },
      // {
      //   path: 'virtual-character',
      //   loadChildren: () =>
      //     import('./virtual-character/virtual-charecter.routes').then(
      //       (m) => m.routes
      //   ),
      // },
      // {
      //   path: 'live-conversation',
      //   loadChildren: () =>
      //     import('./live-conversation/live-conversation.routes').then(
      //       (m) => m.routes
      //     ),
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
