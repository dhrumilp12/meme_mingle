import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  FormControl,
} from '@angular/forms';
import { AuthService } from '../../auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { passwordMatchValidator, passwordStrengthValidator } from 'src/app/shared/constant/data.constant';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatOptionModule,
  ],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss'],
})
export class SignUpComponent implements OnInit {
  signUpForm!: FormGroup;
  errorMessage: string = '';
  hidePassword = true;
  submitted = false;
  hideConfirmPassword = true;
  selectedFile: File | null = null;
  fileError: string = '';
  isSubmitting: boolean = false;

  // Define supported languages
  supportedLanguages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ko', label: 'Korean' },
    { code: 'ru', label: 'Russian' },
    { code: 'ar', label: 'Arabic' },
    { code: 'hi', label: 'Hindi' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'it', label: 'Italian' },
    { code: 'gu', label: 'Gujarati' },
    { code: 'bn', label: 'Bengali' },
    { code: 'de', label: 'German' },
    { code: 'te', label: 'Telugu' },
    // Add more languages as needed
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.signUpForm = new FormGroup(
      {
        username: new FormControl(
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(20),
            Validators.pattern('^[a-zA-Z0-9]+$'),
          ],
        ),
        email: new FormControl('', [Validators.required, Validators.email]),
        password: new FormControl('', [Validators.required, passwordStrengthValidator()]),
        confirmPassword: new FormControl('', Validators.required),
        name: new FormControl('', Validators.required),
        age: new FormControl('', [Validators.min(18), Validators.required]),
        gender: new FormControl('', Validators.required),
        placeOfResidence: new FormControl(''),
        fieldOfStudy: new FormControl(''),
        preferredLanguage: new FormControl('', [
          Validators.required,
          Validators.pattern('^[a-z]{2}$'),
        ]),
      },
      { validators: passwordMatchValidator }
    );
  }

  // Handle file input change
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        this.fileError = 'Only image files (PNG, JPEG, JPG, GIF) are allowed.';
        this.selectedFile = null;
        return;
      }

      // Validate file size (e.g., max 2MB)
      const maxSizeInBytes = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSizeInBytes) {
        this.fileError = 'File size should not exceed 2MB.';
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;
      this.fileError = '';
    }
  }

  onSubmit() {
    this.submitted = true;
    this.isSubmitting = true;
    this.errorMessage = '';

    if (this.signUpForm.valid) {
      const formValue = { ...this.signUpForm.value };
      delete formValue.confirmPassword;

      const formData = new FormData();
      for (const key in formValue) {
        if (formValue.hasOwnProperty(key) && formValue[key] !== null) {
          formData.append(key, formValue[key]);
        }
      }

      if (this.selectedFile) {
        formData.append('profile_picture', this.selectedFile, this.selectedFile.name);
      }

      this.authService.signUp(formData).subscribe({
        next: (response) => {
          console.log('User registered successfully', response);
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('user_id', response.userId);
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Error registering user', error);
          if (error.status === 409) {
            this.errorMessage = 'A user with this username or email already exists.';
          } else if (error.status === 400) {
            this.errorMessage = error.error.error || 'Failed to register user.';
          } else {
            this.errorMessage = 'An unexpected error occurred. Please try again later.';
          }
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      this.errorMessage = 'Please correct the errors in the form.';
      this.isSubmitting = false;
    }
  }
}
