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
import { AppService } from '../../app.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { passwordMatchValidator, passwordStrengthValidator, supportedLanguages } from 'src/app/shared/constant/data.constant';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss'],
})
export class SignUpComponent implements OnInit {
  signUpForm!: FormGroup;
  errorMessage: string = '';
  hidePassword = true;
  submitted = false;
  currentProfilePicture :any='assets/img/download.png'
  hideConfirmPassword = true;
  selectedFile: File | null = null;
  fileError: string = '';
  isSubmitting: boolean = false;
  isSignUpActive: boolean = true;
  isSignInActive: boolean = false;
  data:any=''

  // Define supported languages
  supportedLanguges = supportedLanguages
  constructor(
    private fb: FormBuilder,
    private authService: AppService,
    private router: Router,
    private toaster :ToastrService
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
          // Validators.pattern('^[a-z]{2}$'),
        ]),
        // profile_picture:new FormControl('',Validators.required)
      },
      { validators: passwordMatchValidator }
    );
  }

  // Handle file input change
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      console.log('hello')
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
      const reader = new FileReader();
      reader.onload = (e) => {
        this.currentProfilePicture = e.target?.result;
      };
      this.selectedFile = file;
      this.data = this.selectedFile.name
      this.fileError = '';
    }
  }

  onSubmit() {
    this.submitted = true;
    this.isSubmitting = true;
    this.errorMessage = '';

    console.log(this.signUpForm.controls,"value")
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
          this.router.navigate(['/home']);
          this.toaster.success('User Register Successfull','Hey there ! ')
        },
        error: (error) => {
          if (error.status === 409) {
            this.toaster.error('A user with this username or email already exists. ')
          } else if (error.status === 400) {
            this.toaster.error(error.error.error || 'Failed to register user.')
          } else {
            this.toaster.error("An unexpected error occurred. Please try again later.")
          }
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      this.toaster.error('Please correct the errors in the form.')
      this.isSubmitting = false;
    }
  }

  showSignUp() {
    this.isSignUpActive = true;
    this.isSignInActive = false;
  }
  
  showSignIn() {
    this.isSignUpActive = false;
    this.isSignInActive = true;
    this.router.navigate(['/auth/sign-in']);
  }
  triggerFileInput(fileInput: HTMLInputElement): void {
    fileInput.click(); // Programmatically trigger the file input
  }
}


