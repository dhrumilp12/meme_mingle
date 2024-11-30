import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResetPasswordComponent } from './reset-password.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService } from '../../app.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockActivatedRoute: any;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    // Create spies for AuthService methods
    mockAuthService = jasmine.createSpyObj('AuthService', ['resetPassword']);

    // Mock ActivatedRoute to provide a token
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('test-token'),
        },
      },
    };

    // Create a spy for Router
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent, ReactiveFormsModule, FormsModule, CommonModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the reset password component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with empty controls', () => {
    expect(component.resetPasswordForm).toBeDefined();
    expect(component.resetPasswordForm.get('password')!.value).toEqual('');
    expect(component.resetPasswordForm.get('confirmPassword')!.value).toEqual('');
  });

  it('should display error if token is missing', () => {
    // Modify the token to simulate a missing token
    component.token = '';
    component.ngOnInit();
    expect(component.errorMessage).toEqual('Invalid or missing token.');
  });

  it('should validate password and confirmPassword fields', () => {
    const passwordControl = component.resetPasswordForm.get('password')!;
    const confirmPasswordControl = component.resetPasswordForm.get('confirmPassword')!;

    passwordControl.setValue('short');
    confirmPasswordControl.setValue('short');

    expect(component.resetPasswordForm.invalid).toBeTrue();

    passwordControl.setValue('longenoughpassword');
    confirmPasswordControl.setValue('differentpassword');

    expect(component.resetPasswordForm.hasError('passwordsMismatch')).toBeTrue();

    confirmPasswordControl.setValue('longenoughpassword');
    expect(component.resetPasswordForm.valid).toBeTrue();
  });

  it('should call authService.resetPassword on form submit', () => {
    const passwordControl = component.resetPasswordForm.get('password')!;
    const confirmPasswordControl = component.resetPasswordForm.get('confirmPassword')!;

    passwordControl.setValue('validpassword');
    confirmPasswordControl.setValue('validpassword');

    mockAuthService.resetPassword.and.returnValue(of({ message: 'Password reset successful' }));

    component.onSubmit();

    expect(mockAuthService.resetPassword).toHaveBeenCalledWith('test-token', 'validpassword');
    expect(component.message).toEqual('Password reset successful');
    expect(component.errorMessage).toEqual('');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/sign-in']);
  });

  it('should handle error if authService.resetPassword fails', () => {
    const passwordControl = component.resetPasswordForm.get('password')!;
    const confirmPasswordControl = component.resetPasswordForm.get('confirmPassword')!;

    passwordControl.setValue('validpassword');
    confirmPasswordControl.setValue('validpassword');

    mockAuthService.resetPassword.and.returnValue(
      throwError({ error: { error: 'Invalid token' } })
    );

    component.onSubmit();

    expect(mockAuthService.resetPassword).toHaveBeenCalledWith('test-token', 'validpassword');
    expect(component.errorMessage).toEqual('Invalid token');
    expect(component.message).toEqual('');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
