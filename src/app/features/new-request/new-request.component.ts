import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthorizationApi } from '../../core/api.service';
import { ApiError, toApiError } from '../../core/api-error';
import { CaseRequest, PaCase } from '../../core/models';
import { todayIso } from '../../core/presentation';
import { AlertComponent } from '../../shared/alert.component';
import { IconComponent } from '../../shared/icon.component';
import { ToastService } from '../../shared/toast.service';

type Phase = 'idle' | 'creating' | 'analyzing';

const SAMPLE: CaseRequest = {
  patient_id: 'P-1002',
  payer_id: 'NORTHWIND',
  plan_id: 'NW-PPO-GOLD',
  service_code: 'MRI-LSPINE-001',
  order_date: '2026-10-27',
  service_description: 'MRI lumbar spine without contrast',
  diagnosis_code: 'M54.16',
  diagnosis_text: 'Radiculopathy, lumbar region',
  ordering_provider: 'Dr. Demo Clinician',
  encounter_id: '',
};

@Component({
  selector: 'app-new-request',
  imports: [ReactiveFormsModule, RouterLink, AlertComponent, IconComponent],
  templateUrl: './new-request.component.html',
})
export class NewRequestComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(AuthorizationApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly phase = signal<Phase>('idle');
  protected readonly submitted = signal(false);
  protected readonly formError = signal('');
  protected readonly createdId = signal('');
  protected readonly elapsed = signal(0);
  private clock: ReturnType<typeof setInterval> | null = null;

  protected readonly form = this.fb.group({
    patient_id: ['', [Validators.required]],
    payer_id: ['NORTHWIND', [Validators.required]],
    plan_id: ['NW-PPO-GOLD', [Validators.required]],
    service_code: ['MRI-LSPINE-001', [Validators.required]],
    order_date: [todayIso(), [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
    service_description: [''],
    diagnosis_code: [''],
    diagnosis_text: [''],
    ordering_provider: [''],
    encounter_id: [''],
  });

  constructor() {
    const q = inject(ActivatedRoute).snapshot.queryParamMap;
    for (const f of ['payer_id', 'plan_id', 'service_code']) {
      const v = q.get(f);
      if (v) this.form.get(f)?.setValue(v);
    }

    inject(DestroyRef).onDestroy(() => this.stopClock());
  }

  protected fillSample(): void {
    this.form.patchValue(SAMPLE);
    this.formError.set('');
  }

  protected reset(): void {
    this.form.reset({ payer_id: 'NORTHWIND', plan_id: 'NW-PPO-GOLD', service_code: 'MRI-LSPINE-001', order_date: todayIso() });
    this.submitted.set(false);
    this.formError.set('');
  }

  /** Message for a field, shown only after the user touched it or tried to submit. */
  protected err(name: string): string | null {
    const c = this.form.get(name);
    if (!c || !(c.touched || this.submitted())) return null;
    if (c.errors?.['server']) return c.errors['server'] as string;
    if (c.errors?.['required']) return 'Required';
    if (c.errors?.['pattern']) return 'Use the format YYYY-MM-DD';
    return null;
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.formError.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.host.nativeElement.querySelector<HTMLElement>('.ng-invalid[formControlName]')?.focus();
      return;
    }

    this.phase.set('creating');
    this.startClock();

    let created: PaCase;
    try {
      created = await firstValueFrom(this.api.createCase(this.payload()));
      if (!created?.case_id) throw new Error('The API did not return a case_id.');
    } catch (e) {
      this.stopClock();
      this.phase.set('idle');
      this.showServerError(toApiError(e));
      return;
    }

    this.createdId.set(created.case_id);
    this.phase.set('analyzing');
    try {
      await firstValueFrom(this.api.analyze(created.case_id));
      this.toast.success(`Analysis complete for ${created.case_id}.`);
    } catch (e) {
      this.toast.error(`Case ${created.case_id} was created, but the analysis failed: ${toApiError(e).message}`);
    }

    this.stopClock();
    this.phase.set('idle');
    await this.router.navigate(['/cases', created.case_id]);
  }

  private payload(): CaseRequest {
    const v = this.form.getRawValue();
    const t = (s: string) => s.trim();
    return {
      patient_id: t(v.patient_id),
      payer_id: t(v.payer_id),
      plan_id: t(v.plan_id),
      service_code: t(v.service_code),
      order_date: t(v.order_date),
      service_description: t(v.service_description),
      diagnosis_code: t(v.diagnosis_code),
      diagnosis_text: t(v.diagnosis_text),
      ordering_provider: t(v.ordering_provider),
      encounter_id: t(v.encounter_id),
    };
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
    // Field-level messages already sit next to the inputs; show the banner for everything else.
    this.formError.set(mapped ? 'Please fix the highlighted fields.' : e.message);
  }

  private startClock(): void {
    this.elapsed.set(0);
    this.stopClock();
    this.clock = setInterval(() => this.elapsed.update((n) => n + 1), 1000);
  }

  private stopClock(): void {
    if (this.clock) clearInterval(this.clock);
    this.clock = null;
  }
}
