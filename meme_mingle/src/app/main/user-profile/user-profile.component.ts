import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AppService } from '../../app.service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { environment } from '../../shared/environments/environment';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog.component';
import { supportedLanguages } from '../../shared/constant/data.constant';
import { NavbarMainComponent } from '../../layout/navbar-main/navbar-main.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
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
    NavbarMainComponent,
    MatSnackBarModule,
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {

  /** Form and UI states */
  profileForm!: FormGroup;
  isLoading: boolean = true;
  isSubmitting: boolean = false;

  /** For the custom gender slider */
  genders: string[] = ['male', 'female', 'other'];
  genderIndex: number = 0;   // tracks which gender is active in the slider

  /** For profile image upload */
  selectedFile: File | null = null;
  selectedImageUrl: any = null;
  currentProfilePicture: any = '';
 
  preferredLanguage: string = 'en';
  translatedTexts: { [key: string]: string } = {};
  /** Supported languages for the mat-select */
  supportedLanguages = supportedLanguages;

  /** environment / backend */
  baseUrl: string = environment.baseUrl;
  backendUrl: string = environment.baseUrl;

  constructor(
    private fb: FormBuilder,
    private appService: AppService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    // Check authentication
    if (!this.appService.isAuthenticated()) {
      this.router.navigate(['/auth/sign-in'], {
        queryParams: { error: 'Please sign in to access your profile.' }
      });
      return;
    }

    // Initialize form
    this.profileForm = this.fb.group({
      username: [
        { value: '', disabled: true },
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          this.alphanumericValidator
        ]
      ],
      email: [
        { value: '', disabled: true },
        [Validators.required, Validators.email]
      ],
      name: ['', [Validators.minLength(2)]],
      age: ['', [Validators.min(18), Validators.max(120)]],
      gender: [''],  // controlled by our slider
      placeOfResidence: [''],
      fieldOfStudy: [''],
      preferredLanguage: ['']
    });

    this.fetchUserProfile();

    this.preferredLanguage = localStorage.getItem('preferredLanguage') || 'en';

    if (this.preferredLanguage !== 'en') {
      this.translateContent(this.preferredLanguage);
    }

  }

  // Translate content to the target language
  private translateContent(targetLanguage: string) {
    const elementsToTranslate = document.querySelectorAll('[data-translate]');
    const textsToTranslate = Array.from(elementsToTranslate).map(
      (el) => el.textContent?.trim() || ''
    );

    // Include additional texts that are not in data-translate attributes
    const additionalTexts = [
      'male',
      'female',
      'other',
      'English',
      'Spanish',
      'French',
      'German',
      'Chinese',
      'Japanese',
      'Korean',
      'Russian',
      'Arabic',
      'Hindi',
      'Portuguese',
      'Italian',
      'Gujarati',
      'Bengali',
      'Preferred Language',
      'Telugu',
      'Processing...',
      'Edit Profile',
      'Delete Account',
      'Updating...'
    ];
    const allTextsToTranslate = [...textsToTranslate, ...additionalTexts];

    this.appService
      .translateTexts(allTextsToTranslate, targetLanguage)
      .subscribe((response) => {
        const translations = response.translations;

        // Translate texts from data-translate elements
        elementsToTranslate.forEach((element, index) => {
          const originalText = textsToTranslate[index];
          this.translatedTexts[originalText] = translations[index];

          // Update directly if it's a regular DOM element
          if (!(element.tagName.startsWith('MAT-'))) {
            element.textContent = translations[index];
          }
        });

        // Handle additional texts
        additionalTexts.forEach((text, index) => {
          const translatedText = translations[textsToTranslate.length + index];
          this.translatedTexts[text] = translatedText;
        });
      });
  }
  
  /**
   * Custom validator to ensure username is alphanumeric
   */
  alphanumericValidator(control: any) {
    const value = control.value;
    if (value && !/^[a-zA-Z0-9]+$/.test(value)) {
      return { alphanumeric: true };
    }
    return null;
  }

  /**
   * Fetch the user profile from the backend, patch form, set up slider
   */
  fetchUserProfile(): void {
    this.appService.getUserProfile().subscribe({
      next: (response) => {
        // Patch the form with the backend data
        this.profileForm.patchValue({
          username: response.username || '',
          email: response.email || '',
          name: response.name || '',
          age: response.age || '',
          gender: response.gender || '',
          placeOfResidence: response.placeOfResidence || '',
          fieldOfStudy: response.fieldOfStudy || '',
          preferredLanguage: response.preferredLanguage || 'en'
        });

        // Update the gender slider index
        const genderFromBackend = response.gender || 'male';
        const idx = this.genders.indexOf(genderFromBackend);
        this.genderIndex = idx >= 0 ? idx : 0;

        // Handle profile picture
        if (response.profile_picture) {
          this.currentProfilePicture = response.profile_picture.startsWith('http')
            ? response.profile_picture
            : `${this.backendUrl}${response.profile_picture}`;
        } else {
          this.currentProfilePicture = '/assets/img/user_avtar.jpg';
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching user profile:', error);
        this.snackBar.open(
          error.error?.error || 'Failed to load profile. Please try again later.',
          'Close',
          { duration: 3000,  horizontalPosition: 'center' }
        );
        this.isLoading = false;
      }
    });
  }

  /**
   * Cycles the gender slider left (-1) or right (+1)
   */
  changeGender(direction: number): void {
    this.genderIndex += direction;
    // Wrap around if out of bounds
    if (this.genderIndex < 0) {
      this.genderIndex = this.genders.length - 1;
    } else if (this.genderIndex >= this.genders.length) {
      this.genderIndex = 0;
    }
    // Update the form control with the new gender
    const currentGender = this.genders[this.genderIndex];
    this.profileForm.patchValue({ gender: currentGender });
  }

  /**
   * Handle file selection for profile picture
   */
  onFileSelected(event: Event): void {
    const input: any = event.target;
    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        this.selectedImageUrl = e.target?.result;
        this.currentProfilePicture = e.target?.result;
      };
      reader.readAsDataURL(file);
      this.selectedFile = file;
    }
  }

  /**
   * Submit the updated profile form (including optional new pic)
   */
  onSubmit(): void {
    if (this.profileForm.invalid) {
      // Show an error snackBar
      this.snackBar.open('Please correct the errors in the form.', 'Close', {
        duration: 3000,  horizontalPosition: 'center'
      });
      return;
    }

    this.isSubmitting = true;
    

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

    this.appService.updateUserProfile(formData).subscribe({
      next: (response) => {
        // Show a success snackBar
        this.snackBar.open('Profile updated successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'center'
        });

        // Update preferred language
      const newPreferredLanguage = this.profileForm.get('preferredLanguage')?.value;
      if (newPreferredLanguage && newPreferredLanguage !== this.preferredLanguage) {
        this.preferredLanguage = newPreferredLanguage;
        localStorage.setItem('preferredLanguage', newPreferredLanguage);
        this.translateContent(newPreferredLanguage);
      }

        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.snackBar.open(
          error.error?.error || 'Failed to update profile.',
          'Close',
          { duration: 3000,  horizontalPosition: 'center' }
         
        );
        this.isSubmitting = false;
      }
    });
  }

  /**
   * Open confirmation dialog for profile deletion
   */
  openDeleteConfirmationDialog(): void {
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.deleteProfile();
      }
    });
  }

  /**
   * Programmatically trigger the file input for avatar
   */
  triggerFileInput(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  /**
   * Delete the profile (after confirming)
   */
  deleteProfile(): void {
    this.isSubmitting = true;
    this.appService.deleteUserProfile().subscribe(
      response => {
        this.isSubmitting = false;
        // Show a success snackBar
        this.snackBar.open('Your profile has been deleted successfully.', 'Close', {
          duration: 3000,  horizontalPosition: 'center'
        });
        this.appService.signOut();
        this.router.navigate(['/auth/sign-up']);
      },
      error => {
        this.isSubmitting = false;
        // Show an error snackBar
        this.snackBar.open('An error occurred while deleting your profile.', 'Close', {
          duration: 3000,  horizontalPosition: 'center'
        });
      }
    );
  }
}