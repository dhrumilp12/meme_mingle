// src/app/virtual-character/virtual-character.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../shared/environments/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ModelService {
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  // Method to get the model URL
  getModelUrl(): Observable<string> {
    const url = `${this.baseUrl}/static/models/scene.gltf`;
    console.log('Generated Model URL:', url); // Log the URL for debugging

    // Optionally, perform a HEAD request to check if the model exists
    return this.http.head(url, { observe: 'response' }).pipe(
      map(response => {
        if (response.status === 200) {
          return url;
        } else {
          throw new Error('Model not found');
        }
      }),
      catchError(err => {
        console.error('Error fetching model URL:', err);
        return throwError(() => new Error('Failed to load the 3D model.'));
      })
    );
  }
}
