import { Component, input } from '@angular/core';
import { Presentation } from '../core/presentation';
import { IconComponent } from './icon.component';

/** Coloured status pill. Pass a Presentation from core/presentation.ts. */
@Component({
  selector: 'app-chip',
  imports: [IconComponent],
  template: `<span [class]="'chip tone-' + p().tone">
    @if (icon()) {
      <app-icon [name]="p().icon" [size]="14" />
    }
    {{ p().label }}
  </span>`,
})
export class ChipComponent {
  readonly p = input.required<Presentation>();
  readonly icon = input(true);
}
