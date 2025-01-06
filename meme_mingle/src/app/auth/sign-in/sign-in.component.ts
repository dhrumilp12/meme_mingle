// sign-in.component.ts
import { Component, OnInit, NgZone } from '@angular/core';
import {
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  FormControl,
} from '@angular/forms';
import { AppService } from '../../app.service';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from 'src/app/shared/environments/environment';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
})
export class SignInComponent implements OnInit {
  signInForm!: FormGroup;
  errorMessage: string = '';
  hidePassword = true;
  submitted = false;
  showPassword: any = false;
  isSubmitting: boolean = false;
  isSignInActive: boolean = true;
  isSignUpActive: boolean = false;

  constructor(
    private authService: AppService,
    private router: Router,
    private ngZone: NgZone,
    private toaster : ToastrService
  ) {}

  ngOnInit() {
    this.signInForm = new FormGroup({
      identifier: new FormControl('', [Validators.required]) ,
      password: new FormControl('', Validators.required),
    });

    // window.addEventListener('message', this.handleMessage.bind(this), false);

    // this.authService.subjectsubscribe.subscribe((value:any)=>{
    //   console.log(value,"value")
    // })
  }

  // Getters for form controls
  // get identifier(): AbstractControl {
  //   return this.signInForm.get('identifier')!;
  // }

  // get password(): AbstractControl {
  //   return this.signInForm.get('password')!;
  // }

  
  onSubmit() {
    this.submitted = true;
    this.isSubmitting = true;
    this.errorMessage = '';
    if (this.signInForm.valid) {
       
      this.authService.signIn(this.signInForm.value).subscribe({
        next: (response) => {
          this.toaster.success("Login successfull",'User Login')
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('user_id', response.userId);
          localStorage.setItem('preferredLanguage', response.preferredLanguage);
          this.router.navigate(['/main']);        },
        error: (error) => {
          console.error('Error during login:', error);
          if (error.status === 401) {
            this.toaster.error("Invalid email/username or password.",'Login Failed')
          } else if (error.status === 400) {
            this.toaster.error(error.error.msg || 'Please provide valid credentials.')
          } else {
            this.toaster.error('An unexpected error occurred. Please try again later.')
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

  

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  showSignIn() {
    this.isSignInActive = true;
    this.isSignUpActive = false;

  }
  showSignUp() {
    this.isSignUpActive = true;
    this.isSignInActive = false;
    this.router.navigate(['/auth/sign-up']);

  }


  signInWithGoogle() {
    const googleAuthUrl = `${environment.baseUrl}/auth/google`;
    window.location.href = googleAuthUrl;
  }
  

  private handleMessage(event: MessageEvent) {
    const trustedOrigin = window.location.origin;
    if (event.origin !== trustedOrigin) {
      return;
    }

    const data = event.data;
    console.log('Received message:', data);
    if (data.type === 'google-auth' && data.token) {
      this.ngZone.run(() => {
        localStorage.setItem('access_token', data.token);
        localStorage.setItem('user_id', data.userId);
        this.router.navigate(['/dashboard']); // Adjust the route as needed
      });
    }
  }
}