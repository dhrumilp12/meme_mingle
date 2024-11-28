import { AbstractControl, ValidationErrors } from "@angular/forms";

export function passwordStrengthValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value || '';
      const passwordValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(
        value
      );
      return passwordValid ? null : { passwordStrength: true };
    };
  }
  
  // Custom Validator for Password Match
 export  function passwordMatchValidator(form: AbstractControl) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordsMismatch: true };
    }
    return null;
  }