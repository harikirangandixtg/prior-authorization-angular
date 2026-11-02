import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { Role, SignupRequest } from '../../core/models';
import { AlertComponent } from '../../shared/alert.component';
import { IconComponent } from '../../shared/icon.component';
import { PasswordInputComponent } from '../../shared/password-input.component';
import { emailDomain, passwordChecks, passwordsMatch, strongPassword } from './auth-validators';

const atLeastOneRole = (g: AbstractControl): ValidationErrors | null =>
  g.get('requester')?.value || g.get('reviewer')?.value ? null : { noRole: true };

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink, AlertComponent, IconComponent, PasswordInputComponent],
  templateUrl: './signup.component.html',
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.group(
    {
      full_name: [''],
      email: ['', [Validators.required, emailDomain]],
      password: ['', [Validators.required, strongPassword]],
      confirm_password: ['', [Validators.required]],
      roles: ['requester' as Role, [Validators.required]]
    },
    { validators: passwordsMatch('password', 'confirm_password') },
  );

  private readonly pw = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected checks = () => passwordChecks(this.pw());

  protected err(name: 'email' | 'password' | 'confirm_password' | 'full_name'): string | null {
    const c = this.form.controls[name];
    if (!(c.touched || this.submitted())) return null;
    if (c.errors?.['server']) return c.errors['server'] as string;
    if (c.errors?.['required']) return 'Required';
    if (c.errors?.['domain']) return 'Use your @xtglobal.com email address';
    if (c.errors?.['weak']) return 'The password does not meet the rules below';
    if (name === 'confirm_password' && this.form.errors?.['mismatch']) return 'Passwords do not match';
    return null;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;

    const v = this.form.getRawValue();
    // Exactly the fields the API accepts: extra fields are rejected with a 422.
    const body: SignupRequest = {
      email: v.email.trim(),
      password: v.password,
      confirm_password: v.confirm_password,
      roles: [v.roles],
    };
    if (v.full_name.trim()) body.full_name = v.full_name.trim();

    this.busy.set(true);
    this.auth.signup(body).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (e) => {
        this.busy.set(false);
        this.showServerError(toApiError(e));
      },
    });
  }

  private showServerError(e: ApiError): void {
    let mapped = false;
    for (const [field, msg] of Object.entries(e.fieldErrors)) {
      const control = this.form.get(field);
      if (control) {
        control.setErrors({ server: msg });
        control.markAsTouched();
        mapped = true;
      }
    }
    if (e.status === 409 || (e.status === 400 && /email|domain/i.test(e.message))) {
      this.form.controls.email.setErrors({ server: e.message });
      this.form.controls.email.markAsTouched();
      mapped = true;
    }
    this.error.set(mapped ? 'Please fix the highlighted fields.' : e.message);
  }
}
