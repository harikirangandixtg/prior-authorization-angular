import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthorizationApi } from '../../core/api.service';
import { toApiError } from '../../core/api-error';
import { PolicySearchResponse } from '../../core/models';
import { paRequired } from '../../core/presentation';
import { AlertComponent } from '../../shared/alert.component';
import { ChipComponent } from '../../shared/chip.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-policies',
  imports: [DatePipe, ReactiveFormsModule, AlertComponent, ChipComponent, IconComponent],
  templateUrl: './policies.component.html',
})
export class PoliciesComponent {
  private readonly api = inject(AuthorizationApi);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly paRequired = paRequired;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly result = signal<PolicySearchResponse | null>(null);
  protected readonly items = computed(() => this.result()?.items ?? []);

  protected readonly form = this.fb.group({
    payer_id: [''],
    plan_id: [''],
    service_code: [''],
    query: [''],
  });

  constructor() {
    this.search();
  }

  protected search(): void {
    this.state.set('loading');
    const f = this.form.getRawValue();
    this.api.searchPolicies(f.payer_id, f.plan_id, f.service_code, f.query).subscribe({
      next: (r) => {
        this.result.set(r);
        this.state.set('ready');
      },
      error: (e) => {
        this.error.set(toApiError(e).message);
        this.state.set('error');
      },
    });
  }

  protected clear(): void {
    this.form.reset();
    this.search();
  }

  protected requestParams(i: { payer_id: string; plan_id: string; service_code: string }) {
    return { payer_id: i.payer_id, plan_id: i.plan_id, service_code: i.service_code };
  }
}
