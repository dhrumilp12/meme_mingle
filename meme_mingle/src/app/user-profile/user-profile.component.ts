// user-profile.component.ts

import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../app.service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { environment } from '../shared/environments/environment';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {
  profileForm!: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = true;
  isSubmitting: boolean = false;

  genders: string[] = ['male', 'female', 'other'];
  selectedFile: File | null = null;
  selectedImageUrl: string | ArrayBuffer | null = null;
  currentProfilePicture: string = '';
  baseUrl: string = environment.baseUrl;
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog 
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/sign-in'], { queryParams: { error: 'Please sign in to access your profile.' } });
      return;
    }

    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), this.alphanumericValidator]],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]], // Disabled field
      name: ['', [Validators.minLength(2)]],
      age: ['', [Validators.min(18), Validators.max(120)]],
      gender: [''],
      placeOfResidence: [''],
      fieldOfStudy: [''],
      preferredLanguage: [''],
      // profile_picture is handled separately
    });

    this.fetchUserProfile();
  }

  // Custom validator to ensure username is alphanumeric
  alphanumericValidator(control: any) {
    const value = control.value;
    if (value && !/^[a-zA-Z0-9]+$/.test(value)) {
      return { alphanumeric: true };
    }
    return null;
  }

  fetchUserProfile(): void {
    this.authService.getUserProfile().subscribe({
      next: (response) => {
        this.profileForm.patchValue({
          username: response.username || '',
          email: response.email || '',
          name: response.name || '',
          age: response.age || '',
          gender: response.gender || '',
          placeOfResidence: response.placeOfResidence || '',
          fieldOfStudy: response.fieldOfStudy || '',
          preferredLanguage: response.preferredLanguage || 'en',
        });

        this.currentProfilePicture = response.profile_picture;
        console.log('Current profile picture:', this.currentProfilePicture);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching user profile:', error);
        this.errorMessage = 'Failed to load profile. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        this.selectedImageUrl = e.target?.result as string | ArrayBuffer | null;
      };

      reader.readAsDataURL(file);
      this.selectedFile = file;
    }
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.errorMessage = 'Please correct the errors in the form.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = new FormData();
    const updatedData = this.profileForm.value;

    // Append updated fields
    for (const key in updatedData) {
      if (updatedData.hasOwnProperty(key)) {
        formData.append(key, updatedData[key]);
      }
    }

    // Append profile picture if a new file is selected
    if (this.selectedFile) {
      formData.append('profile_picture', this.selectedFile);
    }

    this.authService.updateUserProfile(formData).subscribe({
      next: (response) => {
        this.successMessage = 'Profile updated successfully.';
        this.isSubmitting = false;
        // Optionally, redirect to dashboard
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000); // Redirect after 2 seconds
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.errorMessage = error.error.error || 'Failed to update profile.';
        this.isSubmitting = false;
      }
    });
    
  }

  openDeleteConfirmationDialog(): void {
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.deleteProfile();
      }
    });
  }

  deleteProfile(): void {
    this.isSubmitting = true;
    this.authService.deleteUserProfile().subscribe(
      response => {
        this.isSubmitting = false;
        // Optionally, show a success message
        this.successMessage = 'Your profile has been deleted successfully.';
        // Perform any additional cleanup, then navigate away
        this.authService.signOut();
        this.router.navigate(['/auth/sign-up']);
      },
      error => {
        this.isSubmitting = false;
        this.errorMessage = 'An error occurred while deleting your profile.';
      }
    );
  }
}
