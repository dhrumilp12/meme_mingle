// forgot-password.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AppService } from '../../app.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-forgot-password',
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
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  message: string = '';
  errorMessage: string = '';

  constructor(private fb: FormBuilder, private authService: AppService, private router: Router) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    // Any initialization logic can go here
  }

  // Getter for email form control
  get email(): AbstractControl {
    return this.forgotPasswordForm.get('email')!;
  }

  // Handle form submission
  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    const userEmail = this.email.value;

    this.authService.requestPasswordReset(userEmail).subscribe({
      next: (response: any) => { // Replace 'any' with your response type
        this.message = response.message || 'Password reset link sent successfully.';
        this.errorMessage = '';
        this.forgotPasswordForm.reset();
      },
      error: (error: any) => { // Replace 'any' with your error type
        this.errorMessage = error.error.error || 'An error occurred. Please try again.';
        this.message = '';
      },
    });
  }
}
