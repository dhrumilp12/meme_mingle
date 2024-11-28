import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./user-profile.component').then((m) => m.UserProfileComponent),
        
    }
];