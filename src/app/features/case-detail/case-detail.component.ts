import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthorizationApi } from '../../core/api.service';
import { toApiError } from '../../core/api-error';
import { AuditEvent, AuditResponse, Criterion, DraftResponse, EvidenceItem, EvidenceResponse, PaCase } from '../../core/models';
import {
  auditAction,
  caseStatus,
  criterionStatus,
  evidenceKind,
  humanize,
  overallResult,
  reviewStatus,
  submissionStatus,
  timeAgo,
} from '../../core/presentation';
import { AlertComponent } from '../../shared/alert.component';
import { ChipComponent } from '../../shared/chip.component';
import { CitedTextComponent } from '../../shared/cited-text.component';
import { IconComponent } from '../../shared/icon.component';
import { IconName } from '../../shared/icons';
import { RefComponent } from '../../shared/ref.component';
import { ToastService } from '../../shared/toast.service';

type TabId = 'criteria' | 'evidence' | 'draft' | 'audit';

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'criteria', label: 'Criteria', icon: 'shield-check' },
  { id: 'evidence', label: 'Evidence', icon: 'layers' },
  { id: 'draft', label: 'Draft packet', icon: 'file-text' },
  { id: 'audit', label: 'Audit trail', icon: 'activity' },
];

interface Loadable<T> {
  state: 'idle' | 'loading' | 'ready' | 'missing' | 'error';
  data: T | null;
  error: string;
}
const idle = <T,>(): Loadable<T> => ({ state: 'idle', data: null, error: '' });

interface CorrectionRow {
  criterion_id: string;
  text: string;
  status: string;
  rationale: string;
  origStatus: string;
  origRationale: string;
}

@Component({
  selector: 'app-case-detail',
  imports: [DatePipe, FormsModule, RouterLink, AlertComponent, ChipComponent, CitedTextComponent, IconComponent, RefComponent],
  templateUrl: './case-detail.component.html',
})
export class CaseDetailComponent {
  private readonly api = inject(AuthorizationApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  // presentation helpers used by the template
  protected readonly tabs = TABS;
  protected readonly caseStatus = caseStatus;
  protected readonly criterionStatus = criterionStatus;
  protected readonly reviewStatus = reviewStatus;
  protected readonly submissionStatus = submissionStatus;
  protected readonly evidenceKind = evidenceKind;
  protected readonly auditAction = auditAction;
  protected readonly timeAgo = timeAgo;

  protected caseId = '';
  protected readonly loadState = signal<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  protected readonly loadError = signal('');
  protected readonly detail = signal<PaCase | null>(null);
  protected readonly tab = signal<TabId>('criteria');
  protected readonly evidence = signal<Loadable<EvidenceResponse>>(idle());
  protected readonly draft = signal<Loadable<DraftResponse>>(idle());
  protected readonly audit = signal<Loadable<AuditResponse>>(idle());
  protected readonly kindFilter = signal('all');
  protected readonly rerunning = signal(false);

  // review form
  protected readonly statusOptions = ['Met', 'NotMet', 'Unknown', 'Conflicting'];
  protected decision: 'ACCEPTED' | 'CORRECTED' = 'ACCEPTED';
  protected comment = '';
  protected corrections: CorrectionRow[] = [];
  protected readonly reviewBusy = signal(false);
  protected readonly reviewError = signal('');

  protected readonly overall = computed(() => overallResult(this.detail()?.overall));
  protected readonly canReview = computed(() => (this.detail()?.criteria.length ?? 0) > 0);
  protected readonly demoNote = computed(() => this.detail()?.notes.find((n) => /^DEMO MODE/i.test(n)) ?? null);

  protected readonly tally = computed(() => {
    const counts = new Map<string, number>();
    for (const k of this.detail()?.criteria ?? []) counts.set(k.status, (counts.get(k.status) ?? 0) + 1);
    return [...counts].map(([status, count]) => ({ status, count }));
  });

  protected readonly summaryText = computed(() => {
    switch (this.detail()?.overall) {
      case 'ReadyForReview': return 'The analysis is complete. A reviewer should confirm the findings and the draft packet.';
      case 'NeedsInformation': return 'Some criteria could not be confirmed from the record. See what is missing below.';
      case 'MeetsCriteria': return 'The record satisfies the policy criteria.';
      case 'DoesNotMeetCriteria': return 'The record does not satisfy the policy criteria.';
      case 'NotRequired': return 'This service does not require prior authorization.';
      default: return 'There is no analysis result for this case yet.';
    }
  });

  protected readonly evidenceKinds = computed(() => {
    const counts = new Map<string, number>();
    for (const e of this.evidence().data?.evidence ?? []) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
    return [...counts].map(([kind, count]) => ({ kind, count, label: evidenceKind(kind).label }));
  });

  protected readonly evidenceRows = computed(() => {
    const k = this.kindFilter();
    return (this.evidence().data?.evidence ?? [])
      .filter((e) => k === 'all' || e.kind === k)
      .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
  });

  protected readonly auditRows = computed(() =>
    [...(this.audit().data?.events ?? [])].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)),
  );

  constructor() {
    const initial = this.route.snapshot.queryParamMap.get('tab');
    if (TABS.some((t) => t.id === initial)) this.tab.set(initial as TabId);

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      this.caseId = p.get('id') ?? '';
      this.resetTabData();
      this.loadCase();
    });
  }

  // ---------------------------------------------------------------- loading

  protected loadCase(): void {
    this.loadState.set('loading');
    this.api.getCase(this.caseId).subscribe({
      next: (c) => {
        this.setCase(c);
        this.loadState.set('ready');
        this.ensureTab(this.tab());
      },
      error: (e) => {
        const err = toApiError(e);
        this.loadError.set(err.message);
        this.loadState.set(err.status === 404 ? 'notfound' : 'error');
      },
    });
  }

  private setCase(c: PaCase): void {
    this.detail.set(c);
    this.corrections = c.criteria.map((k) => ({
      criterion_id: k.criterion_id,
      text: k.text,
      status: k.status,
      rationale: k.rationale ?? '',
      origStatus: k.status,
      origRationale: k.rationale ?? '',
    }));
    this.decision = 'ACCEPTED';
    this.comment = '';
    this.reviewError.set('');
  }

  protected selectTab(t: TabId): void {
    this.tab.set(t);
    this.ensureTab(t);
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private ensureTab(t: TabId): void {
    if (t === 'evidence') this.fetch(this.evidence, () => this.api.getEvidence(this.caseId));
    if (t === 'draft') this.fetch(this.draft, () => this.api.getDraft(this.caseId));
    if (t === 'audit') this.fetch(this.audit, () => this.api.getAudit(this.caseId));
  }

  private resetTabData(): void {
    this.evidence.set(idle());
    this.draft.set(idle());
    this.audit.set(idle());
  }

  private fetch<T>(target: WritableSignal<Loadable<T>>, request: () => Observable<T>): void {
    if (target().state !== 'idle') return;
    target.set({ state: 'loading', data: null, error: '' });
    request().subscribe({
      next: (data) => target.set({ state: 'ready', data, error: '' }),
      error: (e) => {
        const err = toApiError(e);
        target.set({ state: err.status === 404 ? 'missing' : 'error', data: null, error: err.message });
      },
    });
  }

  protected retry<T>(target: WritableSignal<Loadable<T>>): void {
    target.set(idle());
    this.ensureTab(this.tab());
  }

  // ---------------------------------------------------------------- actions

  protected async rerun(): Promise<void> {
    if (this.rerunning()) return;
    this.rerunning.set(true);
    try {
      await firstValueFrom(this.api.analyze(this.caseId));
      this.setCase(await firstValueFrom(this.api.getCase(this.caseId)));
      this.resetTabData();
      this.ensureTab(this.tab());
      this.toast.success('Analysis finished.');
    } catch (e) {
      this.toast.error(`Analysis failed: ${toApiError(e).message}`);
    } finally {
      this.rerunning.set(false);
    }
  }

  protected async submitReview(): Promise<void> {
    const c = this.detail();
    if (!c || this.reviewBusy()) return;

    const changed = this.corrections.filter(
      (r) => r.status !== r.origStatus || r.rationale.trim() !== r.origRationale.trim(),
    );
    if (this.decision === 'CORRECTED' && !changed.length && !this.comment.trim()) {
      this.reviewError.set('Change at least one criterion, or add a comment, to record a correction.');
      return;
    }

    this.reviewBusy.set(true);
    this.reviewError.set('');
    try {
      await firstValueFrom(
        this.api.submitReview(c.case_id, {
          decision: this.decision,
          comment: this.comment.trim(),
          corrections:
            this.decision === 'CORRECTED'
              ? changed.map((r) => ({ criterion_id: r.criterion_id, status: r.status, rationale: r.rationale.trim() }))
              : [],
        }),
      );
      this.setCase(await firstValueFrom(this.api.getCase(c.case_id)));
      this.resetTabData();
      this.ensureTab(this.tab());
      this.toast.success('Review saved.');
    } catch (e) {
      this.reviewError.set(toApiError(e).message);
    } finally {
      this.reviewBusy.set(false);
    }
  }

  protected async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success('Copied to clipboard.');
    } catch {
      this.toast.error('Could not copy automatically. Select the text and copy it manually.');
    }
  }

  // ---------------------------------------------------------------- template helpers

  protected disagrees(k: Criterion): boolean {
    return !!k.model_status && !!k.reference_status && k.model_status !== k.reference_status;
  }

  protected badRange(e: EvidenceItem): boolean {
    return !!e.start && !!e.end && e.end < e.start;
  }

  protected details(e: AuditEvent): { key: string; value: string }[] {
    return Object.entries(e.detail ?? {}).map(([k, v]) => ({
      key: humanize(k),
      value: typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v),
    }));
  }

  protected verifierChip = (c: PaCase) =>
    !c.verifier
      ? ({ label: 'Not run', tone: 'neutral', icon: 'info' } as const)
      : c.verifier.ok
        ? ({ label: 'Passed', tone: 'success', icon: 'check-circle' } as const)
        : ({ label: 'Problems found', tone: 'warning', icon: 'alert-triangle' } as const);

  protected val(v: string | null | undefined): string {
    return v && v.trim() ? v : '—';
  }
}
