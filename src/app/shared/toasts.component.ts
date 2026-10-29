import { Component, inject } from '@angular/core';
import { IconComponent } from './icon.component';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toasts',
  imports: [IconComponent],
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div [class]="'toast tone-' + t.tone" [attr.role]="t.tone === 'danger' ? 'alert' : 'status'">
          <app-icon [name]="t.tone === 'success' ? 'check-circle' : t.tone === 'danger' ? 'alert-circle' : 'info'" [size]="20" />
          <span class="toast-msg">{{ t.message }}</span>
          <button type="button" class="icon-btn" aria-label="Dismiss" (click)="toasts.dismiss(t.id)">
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastsComponent {
  protected readonly toasts = inject(ToastService);
}
