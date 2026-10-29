import { IconName } from '../shared/icons';

/** How a raw API value is shown: label, colour tone and icon. Unknown values fall back to a humanised label. */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface Presentation {
  label: string;
  tone: Tone;
  icon: IconName;
}

export function humanize(value: string | null | undefined): string {
  if (!value) return '';
  const spaced = value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const make = (label: string, tone: Tone, icon: IconName): Presentation => ({ label, tone, icon });
const fallback = (v: string | null | undefined): Presentation =>
  make(humanize(v) || '—', 'neutral', 'info');

/** `status` on a case. */
export function caseStatus(v: string | null | undefined): Presentation {
  switch (v) {
    case 'DRAFT_REQUIRES_REVIEW': return make('Awaiting review', 'warning', 'clock');
    case 'NEEDS_INFORMATION': return make('Needs information', 'warning', 'help-circle');
    case 'REVIEWED_ACCEPTED': return make('Accepted', 'success', 'check-circle');
    case 'REVIEWED_CORRECTED': return make('Corrected', 'info', 'clipboard');
    case 'REVIEWED_REJECTED': return make('Rejected', 'danger', 'x-circle');
    case 'FAILED': return make('Analysis failed', 'danger', 'alert-circle');
    case 'CREATED': return make('Created', 'neutral', 'file-text');
    default: return fallback(v);
  }
}

/** `overall` result of the criteria check. */
export function overallResult(v: string | null | undefined): Presentation {
  switch (v) {
    case 'ReadyForReview': return make('Ready for review', 'info', 'clipboard');
    case 'NeedsInformation': return make('Needs information', 'warning', 'help-circle');
    case 'MeetsCriteria': return make('Meets criteria', 'success', 'check-circle');
    case 'DoesNotMeetCriteria': return make('Does not meet criteria', 'danger', 'x-circle');
    case 'NotRequired': return make('PA not required', 'neutral', 'info');
    case null:
    case undefined: return make('Not analyzed', 'neutral', 'clock');
    default: return fallback(v);
  }
}

/** Per-criterion status. */
export function criterionStatus(v: string | null | undefined): Presentation {
  switch (v) {
    case 'Met': return make('Met', 'success', 'check-circle');
    case 'NotMet': return make('Not met', 'danger', 'x-circle');
    case 'Unknown': return make('Unknown', 'warning', 'help-circle');
    case 'Conflicting': return make('Conflicting', 'warning', 'alert-triangle');
    // draft packet vocabulary
    case 'SUPPORTED': return make('Supported', 'success', 'check-circle');
    case 'MISSING': return make('Missing', 'warning', 'help-circle');
    default: return fallback(v);
  }
}

export function reviewStatus(v: string | null | undefined): Presentation {
  switch (v) {
    case 'PENDING': return make('Pending review', 'warning', 'clock');
    case 'ACCEPTED': return make('Accepted', 'success', 'check-circle');
    case 'CORRECTED': return make('Corrected', 'info', 'clipboard');
    case 'REJECTED': return make('Rejected', 'danger', 'x-circle');
    default: return fallback(v);
  }
}

export function submissionStatus(v: string | null | undefined): Presentation {
  switch (v) {
    case 'NOT_SUBMITTED': return make('Not submitted', 'neutral', 'inbox');
    case 'SUBMITTED': return make('Submitted', 'success', 'check-circle');
    default: return fallback(v);
  }
}

export function evidenceKind(v: string | null | undefined): { label: string; icon: IconName } {
  switch (v) {
    case 'condition': return { label: 'Condition', icon: 'activity' };
    case 'medication': return { label: 'Medication', icon: 'pill' };
    case 'procedure': return { label: 'Procedure', icon: 'clipboard' };
    case 'imaging': return { label: 'Imaging', icon: 'scan' };
    default: return { label: humanize(v) || 'Other', icon: 'file-text' };
  }
}

export function auditAction(v: string): { label: string; icon: IconName; tone: Tone } {
  switch (v) {
    case 'CASE_CREATED': return { label: 'Case created', icon: 'plus', tone: 'neutral' };
    case 'ANALYZE_STARTED': return { label: 'Analysis started', icon: 'refresh', tone: 'info' };
    case 'ANALYZE_COMPLETED': return { label: 'Analysis completed', icon: 'check-circle', tone: 'success' };
    default:
      if (v.startsWith('REVIEW')) return { label: humanize(v), icon: 'clipboard', tone: 'info' };
      return { label: humanize(v), icon: 'activity', tone: 'neutral' };
  }
}

/** Short relative time such as "5 min ago"; falls back to a date for older values. */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function paRequired(v: string | null | undefined): Presentation {
  switch ((v ?? '').toLowerCase()) {
    case 'yes': return make('PA required', 'warning', 'shield-check');
    case 'no': return make('No PA needed', 'success', 'check-circle');
    default: return fallback(v);
  }
}

export const byUpdatedDesc = (a: { updated_at: string }, b: { updated_at: string }): number =>
  Date.parse(b.updated_at) - Date.parse(a.updated_at);
