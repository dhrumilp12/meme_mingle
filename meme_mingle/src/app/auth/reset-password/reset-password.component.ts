// reset-password.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { AppService } from '../../app.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  token: string = '';
  message: string = '';
  errorMessage: string = '';

  hidePassword: boolean = true; // Controls visibility for the password field
  hideConfirmPassword: boolean = true; // Controls visibility for the confirm password field

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AppService,
    private router: Router
  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordsMatchValidator });
  }

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Invalid or missing token.';
    }
  }

  // Getters for form controls
  get password(): AbstractControl {
    return this.resetPasswordForm.get('password')!;
  }

  get confirmPassword(): AbstractControl {
    return this.resetPasswordForm.get('confirmPassword')!;
  }

  // Validator to check if passwords match
  passwordsMatchValidator(group: FormGroup) {
    const password = group.get('password')!.value;
    const confirmPassword = group.get('confirmPassword')!.value;
    return password === confirmPassword ? null : { passwordsMismatch: true };
  }

  // Toggle password visibility
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  // Handle form submission
  onSubmit() {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const newPassword = this.password.value;

    this.authService.resetPassword(this.token, newPassword).subscribe({
      next: (response: any) => { // Replace 'any' with your response type
        this.message = response.message || 'Password reset successfully.';
        this.errorMessage = '';
        this.resetPasswordForm.reset();
        // Optionally, redirect to sign-in page after a delay
        setTimeout(() => {
          this.router.navigate(['/auth/sign-in']);
        }, 3000);
      },
      error: (error: any) => { // Replace 'any' with your error type
        this.errorMessage = error.error.error || 'An error occurred. Please try again.';
        this.message = '';
      },
    });
  }
}
