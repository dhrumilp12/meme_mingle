import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./virtual-character.component').then((m) => m.VirtualCharacterComponent),
        
    }
];