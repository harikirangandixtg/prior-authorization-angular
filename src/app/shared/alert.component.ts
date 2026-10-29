import { Component, computed, input } from '@angular/core';
import { Tone } from '../core/presentation';
import { IconComponent } from './icon.component';
import { IconName } from './icons';

const ICON_FOR: Record<Tone, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  neutral: 'info',
};

@Component({
  selector: 'app-alert',
  imports: [IconComponent],
  template: `<div [class]="'alert tone-' + tone()" [attr.role]="tone() === 'danger' ? 'alert' : 'status'">
    <app-icon [name]="icon()" [size]="20" />
    <div class="alert-body">
      @if (heading()) {
        <div class="alert-title">{{ heading() }}</div>
      }
      <div><ng-content /></div>
    </div>
  </div>`,
})
export class AlertComponent {
  readonly tone = input<Tone>('info');
  readonly heading = input('');
  readonly icon = computed(() => ICON_FOR[this.tone()]);
}
