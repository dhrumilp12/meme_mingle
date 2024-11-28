import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./auth.component').then((m) => m.AuthComponent),
        children: [
            {
                path: '',
                redirectTo: 'sign-in',
                pathMatch:'full'
            },
            {
                path: 'sign-in',
                loadComponent:()=>import('./sign-in/sign-in.component').then((m)=>m.SignInComponent),
            },
            {
              path: 'auth-callback',
              loadComponent: () =>
                import('./auth-callback/auth-callback.component').then((m) => m.AuthCallbackComponent),
            },
            {
                path: 'sign-up',
                loadComponent:()=>import('./sign-up/sign-up.component').then((m)=>m.SignUpComponent),
            },
            {
                path: 'forgot-password',
                loadComponent: () =>
                  import('./forgot-password/forgot-password.component').then(
                    (m) => m.ForgotPasswordComponent
                  ),
              },
              {
                path: 'reset-password/:token',
                loadComponent: () =>
                  import('./reset-password/reset-password.component').then(
                    (m) => m.ResetPasswordComponent
                  ),
              },
        ]
    }
];
