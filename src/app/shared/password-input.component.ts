import { Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';

/** Password box with a show/hide button. */
@Component({
  selector: 'app-password-input',
  imports: [ReactiveFormsModule, IconComponent],
  template: `<div class="pw">
    <input
      [id]="inputId()"
      [type]="show() ? 'text' : 'password'"
      [formControl]="control()"
      [attr.autocomplete]="autocomplete()"
      [attr.aria-invalid]="invalid() ? 'true' : null"
      [attr.aria-describedby]="describedBy() || null"
    />
    <button type="button" class="pw-toggle" [attr.aria-label]="show() ? 'Hide password' : 'Show password'" (click)="show.set(!show())">
      <app-icon [name]="show() ? 'eye-off' : 'eye'" [size]="18" />
    </button>
  </div>`,
})
export class PasswordInputComponent {
  readonly control = input.required<FormControl<string>>();
  readonly inputId = input.required<string>();
  readonly autocomplete = input('current-password');
  readonly invalid = input(false);
  readonly describedBy = input('');
  protected readonly show = signal(false);
}
