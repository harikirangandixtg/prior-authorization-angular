import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthorizationApi } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { toApiError } from '../../core/api-error';
import { PaCase } from '../../core/models';
import { byUpdatedDesc, caseStatus } from '../../core/presentation';
import { AlertComponent } from '../../shared/alert.component';
import { BulkUploadComponent } from './bulk-upload.component';
import { CaseTableComponent } from '../../shared/case-table.component';
import { IconComponent } from '../../shared/icon.component';

/** Dashboard shortcuts. The tests match the way the dashboard counts these cases. */
const VIEWS: Record<string, { label: string; test: (c: PaCase) => boolean }> = {
  needs_info: { label: 'Needs information', test: (c) => c.overall === 'NeedsInformation' },
  reviewed: { label: 'Reviewed', test: (c) => c.status.startsWith('REVIEWED') },
};

@Component({
  selector: 'app-cases',
  imports: [RouterLink, AlertComponent, BulkUploadComponent, CaseTableComponent, IconComponent],
  templateUrl: './cases.component.html',
})
export class CasesComponent {
  private readonly api = inject(AuthorizationApi);
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly cases = signal<PaCase[]>([]);
  protected readonly showUpload = signal(false);
  protected readonly view = signal<string | null>(this.route.snapshot.queryParamMap.get('view'));
  protected readonly viewLabel = computed(() => (this.view() ? (VIEWS[this.view()!]?.label ?? null) : null));
  protected readonly query = signal('');
  protected readonly status = signal<string>(this.route.snapshot.queryParamMap.get('status') ?? 'all');

  /** Status filter chips built from what is actually in the data. */
  protected readonly statusOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const c of this.cases()) counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
    return [...counts].map(([value, count]) => ({ value, count, label: caseStatus(value).label }));
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const st = this.status();
    const v = this.view() ? VIEWS[this.view()!] : null;
    return this.cases()
      .filter((c) => !v || v.test(c))
      .filter((c) => st === 'all' || c.status === st)
      .filter(
        (c) =>
          !q ||
          [c.case_id, c.patient_id, c.request.service_code, c.request.service_description, c.request.diagnosis_code]
            .filter(Boolean)
            .some((val) => String(val).toLowerCase().includes(q)),
      )
      .sort(byUpdatedDesc);
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.api.listCases().subscribe({
      next: (list) => {
        this.cases.set(list);
        this.state.set('ready');
      },
      error: (e) => {
        this.error.set(toApiError(e).message);
        this.state.set('error');
      },
    });
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected clear(): void {
    this.query.set('');
    this.status.set('all');
    this.view.set(null);
  }
}