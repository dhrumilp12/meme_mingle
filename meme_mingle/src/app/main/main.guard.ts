import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AppService } from '../app.service';

@Injectable({
  providedIn: 'root',
})
export class MainGuard implements CanActivate {
  constructor(private appService: AppService, private router: Router) {}

  canActivate(): boolean {
    if (!this.appService.isAuthenticated()) {
      // Redirect to 'auth' if not authenticated
      this.router.navigate(['/auth']);
      return false;
    }
    return true;
  }  
}
