import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { TOAST_TYPE } from '../constant/toast';
import { CommonService } from './common.service';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  baseUrl = "apiurl";
  constructor(private http: HttpClient, private injector: Injector) {}

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `An error occurred: ${error.error.message}`;
    } else {
      errorMessage = `Server returned code: ${error.status}, error message is: ${error.message}`;
    }
    let commonService = this.injector.get(CommonService);
    commonService.showToastMessage(TOAST_TYPE.danger, error.error.message);
    return throwError(() => new Error(errorMessage));
  }

  get<T>(url: string, params?: HttpParams): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}/${url}`, { params: params })
      .pipe(catchError(this.handleError.bind(this)));
  }

  post<T>(url: string, body: any,params?:HttpParams): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${url}`, body,{params:params}).pipe(catchError(this.handleError.bind(this)));
  }

  put<T>(url: string, body: any): Observable<T> {
    return this.http
      .put<T>(`${this.baseUrl}/${url}`, body)
      .pipe(catchError(this.handleError.bind(this)));
  }

  patch<T>(url: string, body: any): Observable<T> {
    return this.http
      .patch<T>(`${this.baseUrl}/${url}`, body)
      .pipe(catchError(this.handleError.bind(this)));
  }

  delete<T>(url: string, params?: HttpParams): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${url}`,{params:params}).pipe(catchError(this.handleError.bind(this)));
  }
}
