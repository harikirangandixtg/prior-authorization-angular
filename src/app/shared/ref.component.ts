import { Component, computed, input } from '@angular/core';
import { evidenceKind } from '../core/presentation';
import { IconComponent } from './icon.component';

const PREFIX_TO_KIND: Record<string, string> = {
  condition: 'condition',
  medicationrequest: 'medication',
  procedure: 'procedure',
  diagnosticreport: 'imaging',
};

/** A FHIR reference such as Condition/C-P-1002-1, shown as a small monospace tag. */
@Component({
  selector: 'app-ref',
  imports: [IconComponent],
  template: `<span class="ref" [title]="reference()">
    <app-icon [name]="kind().icon" [size]="13" />
    <span>{{ reference() }}</span>
  </span>`,
})
export class RefComponent {
  readonly reference = input.required<string>();
  readonly kind = computed(() => {
    const prefix = this.reference().split('/')[0]?.toLowerCase() ?? '';
    return evidenceKind(PREFIX_TO_KIND[prefix]);
  });
}
