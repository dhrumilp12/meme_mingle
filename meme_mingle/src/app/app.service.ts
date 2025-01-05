// auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // Import HttpHeaders
import { Observable, of, Subject, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from './shared/environments/environment'; // Import environment


@Injectable({
  providedIn: 'root',
})
export class AppService {
  private baseUrl = environment.baseUrl; 

  constructor(private http: HttpClient, private router: Router) {}

  // for sign up
  signUp(userData:FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/signup`, userData);
  }

  // for sign in
  signIn(credentials: { identifier: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/login`, credentials);
  }

  // for getting user profile
  getUserProfile(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/user/profile`, { headers });
  }

  // for updating user profile
  updateUserProfile(updatedData: FormData): Observable<any> {
    const token = localStorage.getItem('access_token') || '';
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // 'Content-Type' is omitted to allow browser to set it for FormData
    });
  
    return this.http.patch(`${this.baseUrl}/user/profile`, updatedData, { headers });
  }

  // for deleting user profile
  deleteUserProfile(): Observable<any> {
    const url = `${this.baseUrl}/user/profile`;
    return this.http.delete(url, {
      headers: this.getAuthHeaders(),
    });
  }

  // for requesting password reset
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/request_reset`, { email });
  }

  // for resetting password
  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/reset_password/${token}`, { password });
  }

  // for generating ai mentor chat (welcome message)
  aimentorwelcome(user_id: string, role: string = "educational mentor"): Observable<any> {
    const payload = { role };
    return this.http.post(`${this.baseUrl}/ai_mentor/welcome/${user_id}`, payload);
  }

  // for getting ai mentor chat (conversation)
  aimentorchat(userId: string, chatId: string, turnId: number, prompt: string, file?: File): Observable<any> {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('turn_id', turnId.toString());
      if (file) {
          formData.append('file', file);
      }
      return this.http.post(`${this.baseUrl}/ai_mentor/${userId}/${chatId}`, formData);
  }

  // for finalizing ai mentor chat (conversation)
  finalizeChat(userId: string, chatId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/ai_mentor/finalize/${userId}/${chatId}`, {});
  }

  // for converting speech to text
  speechToText(audioFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    return this.http.post(`${this.baseUrl}/ai_mentor/voice-to-text`, formData);
  }

  // for converting text to speech
  textToSpeech(text: string, voiceName: string = 'en-US-AriaNeural', style?: string): Observable<any> {
    const payload = { text, voice_name: voiceName, style };
    return this.http.post(`${this.baseUrl}/ai_mentor/text-to-speech`, payload, { responseType: 'blob' });
  }

  // for translating texts
  translateTexts(texts: string[], targetLanguage: string) {
    return this.http.post<any>(`${this.baseUrl}/translate`, {
      texts,
      target_language: targetLanguage,
    });
  }

  // Fetch quiz questions based on topic or file
  getQuizQuestions(userId: string, topic?: string, file?: File, numQuestions: number = 5, level?: string): Observable<any> {
    const formData = new FormData();
    if (topic) formData.append('topic', topic);
    if (file) formData.append('file', file);
    if (level) formData.append('level', level);
    formData.append('num', numQuestions.toString());

    return this.http.post(`${this.baseUrl}/ai/quiz/${userId}`, formData);
  }

  // Submit quiz answers
  submitQuizAnswers(quizId: string, userId: string, answers: any[]): Observable<any> {
    const payload = {
      user_id: userId,
      answers: answers,
    };
    return this.http.post(`${this.baseUrl}/ai/quiz/${quizId}/submit`, payload);
  }

  // Get total score
  getTotalScore(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/ai/user/${userId}/total_score`);
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

