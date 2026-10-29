import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthorizationApi } from '../../core/api.service';
import { toApiError } from '../../core/api-error';
import { PaCase } from '../../core/models';
import { byUpdatedDesc } from '../../core/presentation';
import { AlertComponent } from '../../shared/alert.component';
import { CaseTableComponent } from '../../shared/case-table.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, AlertComponent, CaseTableComponent, IconComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly api = inject(AuthorizationApi);

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly cases = signal<PaCase[]>([]);

  protected readonly recent = computed(() => [...this.cases()].sort(byUpdatedDesc).slice(0, 6));

  protected readonly stats = computed(() => {
    const all = this.cases();
    return {
      total: all.length,
      awaiting: all.filter((c) => c.status === 'DRAFT_REQUIRES_REVIEW').length,
      needsInfo: all.filter((c) => c.overall === 'NeedsInformation').length,
      reviewed: all.filter((c) => c.status.startsWith('REVIEWED')).length,
      failed: all.filter((c) => c.status === 'FAILED').length,
    };
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
}
