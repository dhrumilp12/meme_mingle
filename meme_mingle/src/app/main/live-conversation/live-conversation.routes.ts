import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./live-conversation.component').then((m) => m.LiveConversationComponent),
        
    }
];