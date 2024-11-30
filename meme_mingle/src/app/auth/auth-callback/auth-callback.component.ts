// auth-callback.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Import the spinner module

@Component({
  selector: 'app-auth-callback',
  standalone: true, // Marking the component as standalone
  imports: [CommonModule, MatProgressSpinnerModule], // Include the spinner module here
  templateUrl: './auth-callback.component.html',
  styleUrls: ['./auth-callback.component.scss'],
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const userId = params['userId'];
      const preferredLanguage = params['preferredLanguage'];
      const error = params['error'];

      if (error) {
        this.router.navigate(['/auth/sign-in'], { queryParams: { error: 'Authentication failed. Please try again.' } });
        return;
      }

      if (token && userId) {
        localStorage.setItem('access_token', token);
        localStorage.setItem('user_id', userId);
        localStorage.setItem('preferred_language', preferredLanguage || 'en'); 
        this.router.navigate(['/user-profile']);
        // Adjust the route as needed
      } else {
        // Handle missing token or userId
        this.router.navigate(['/auth/sign-in'], { queryParams: { error: 'Authentication failed. Please try again.' } });
      }
    });
  }
}
