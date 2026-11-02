import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { AlertComponent } from '../../shared/alert.component';
import { IconComponent } from '../../shared/icon.component';
import { PasswordInputComponent } from '../../shared/password-input.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AlertComponent, IconComponent, PasswordInputComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly resetDone = this.query.get('reset') === '1';
  protected readonly expired = this.query.get('expired') === '1';
  protected readonly busy = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected err(name: 'email' | 'password'): string | null {
    const c = this.form.controls[name];
    if (!(c.touched || this.submitted())) return null;
    if (c.errors?.['required']) return 'Required';
    if (c.errors?.['email']) return 'Enter a valid email address';
    return null;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.error.set('');
    if (this.form.invalid || this.busy()) return;

    const { email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.auth.login(email.trim(), password).subscribe({
      next: () => void this.router.navigateByUrl(this.returnUrl()),
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  /** Only same-site paths are accepted, so a crafted link cannot send people to another site after login. */
  private returnUrl(): string {
    const r = this.query.get('returnUrl') ?? '';
    return r.startsWith('/') && !r.startsWith('//') && !r.startsWith('/login') ? r : '/';
  }
}
