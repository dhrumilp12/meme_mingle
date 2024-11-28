// auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // Import HttpHeaders
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from './shared/environments/environment'; // Import environment

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = environment.baseUrl; 

  constructor(private http: HttpClient, private router: Router) {}

  signUp(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/signup`, userData);
  }

  signIn(credentials: { identifier: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/login`, credentials);
  }

  getUserProfile(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/user/profile`, { headers });
  }

  updateUserProfile( updatedData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.baseUrl}/user/profile`, updatedData, { headers });
  }

  deleteUserProfile(): Observable<any> {
    const url = `${this.baseUrl}/user/profile`;
    return this.http.delete(url, {
      headers: this.getAuthHeaders(),
    });
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/request_reset`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/reset_password/${token}`, { password });
  }

  // Optional: Method to check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // Optional: Method to log out the user
  signOut() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('preferred_language');
    this.router.navigate(['/auth/sign-in']);
  }

  subjectsubscribe = new Subject<number>();
  behavioutsubscribe = new BehaviorSubject([]);

  // Helper method to get authorization headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }
}
