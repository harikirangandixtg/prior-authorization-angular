import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiError, toApiError } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { AlertComponent } from '../../shared/alert.component';
import { IconComponent } from '../../shared/icon.component';
import { PasswordInputComponent } from '../../shared/password-input.component';
import { passwordChecks, passwordsMatch, strongPassword } from './auth-validators';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AlertComponent, IconComponent, PasswordInputComponent],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      new_password: ['', [Validators.required, strongPassword]],
      confirm_password: ['', [Validators.required]],
    },
    { validators: passwordsMatch('new_password', 'confirm_password') },
  );

  private readonly pw = toSignal(this.form.controls.new_password.valueChanges, { initialValue: '' });
  protected checks = () => passwordChecks(this.pw());

  protected err(name: 'email' | 'new_password' | 'confirm_password'): string | null {
    const c = this.form.controls[name];
    if (!(c.touched || this.submitted())) return null;
    if (c.errors?.['server']) return c.errors['server'] as string;
    if (c.errors?.['required']) return 'Required';
    if (c.errors?.['email']) return 'Enter a valid email address';
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
    this.busy.set(true);
    this.auth.resetPassword({ email: v.email.trim(), new_password: v.new_password, confirm_password: v.confirm_password }).subscribe({
      // The API answers the same for unknown emails, so success only means "request accepted".
      next: () => void this.router.navigate(['/login'], { queryParams: { reset: 1 } }),
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
    this.error.set(mapped ? 'Please fix the highlighted fields.' : e.message);
  }
}
