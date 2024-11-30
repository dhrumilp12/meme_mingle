import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignInComponent } from './sign-in.component';
import { ReactiveFormsModule } from '@angular/forms'; // Add this import
import { Router } from '@angular/router'; // For navigation
import { AuthService } from '../../app.service'; // If using real service
import { HttpClientTestingModule } from '@angular/common/http/testing'; // For HttpClient
import { of } from 'rxjs';

describe('SignInComponent', () => {
  let component: SignInComponent;
  let fixture: ComponentFixture<SignInComponent>;
  let mockAuthService: Partial<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    // Create a mock AuthService
    mockAuthService = {
      signIn: jasmine.createSpy('signIn').and.returnValue(of({ access_token: 'test_token', userId: '123' })),
    };

    // Create a spy for Router
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [SignInComponent, ReactiveFormsModule, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: routerSpy },
      ],
    });

    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Additional tests...
});
