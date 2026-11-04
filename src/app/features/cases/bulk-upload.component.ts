import { Component, DestroyRef, HostListener, inject, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthorizationApi } from '../../core/api.service';
import { toApiError } from '../../core/api-error';
import { BulkUploadResponse } from '../../core/models';
import { AlertComponent } from '../../shared/alert.component';
import { IconComponent } from '../../shared/icon.component';

const REQUIRED = ['patient_id', 'payer_id', 'plan_id', 'service_code', 'order_date'];
const OPTIONAL = ['service_description', 'diagnosis_code', 'diagnosis_text', 'ordering_provider', 'encounter_id'];
const MAX_BYTES = 5 * 1024 * 1024;
const POLL_MS = 2000;
const POLL_LIMIT_MS = 15 * 60 * 1000;

type Phase = 'select' | 'uploading' | 'processing' | 'done' | 'failed';

interface RowError { row: string; message: string }

@Component({
  selector: 'app-bulk-upload',
  imports: [AlertComponent, IconComponent],
  templateUrl: './bulk-upload.component.html',
})
export class BulkUploadComponent {
  private readonly api = inject(AuthorizationApi);

  readonly closed = output<void>();
  /** Fires after cases were created, so the list can refresh. */
  readonly uploaded = output<void>();

  protected readonly required = REQUIRED;
  protected readonly optional = OPTIONAL;
  protected readonly phase = signal<Phase>('select');
  protected readonly file = signal<File | null>(null);
  protected readonly fileError = signal('');
  protected readonly analyze = signal(false);
  protected readonly dragging = signal(false);
  protected readonly elapsed = signal(0);
  protected readonly failure = signal('');
  protected readonly createdIds = signal<string[]>([]);
  protected readonly createdCount = signal(0);
  protected readonly rowErrors = signal<RowError[]>([]);

  private clock: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.stopClock();
    });
  }

  protected get busy(): boolean {
    return this.phase() === 'uploading' || this.phase() === 'processing';
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }

  protected close(): void {
    if (!this.busy) this.closed.emit();
  }

  // ------------------------------------------------------------ choosing a file

  protected onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!this.busy) this.dragging.set(true);
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && !this.busy) void this.choose(f);
  }

  protected onPick(e: Event): void {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = ''; // allows picking the same file again
    if (f) void this.choose(f);
  }

  private async choose(f: File): Promise<void> {
    this.file.set(null);
    this.fileError.set('');
    if (!/\.csv$/i.test(f.name)) return this.fileError.set('Only .csv files are accepted.');
    if (f.size === 0) return this.fileError.set('The file is empty.');
    if (f.size > MAX_BYTES) return this.fileError.set('The file is larger than 5 MB.');

    // Check the header row now, so a wrong file fails here and not after an upload.
    const head = (await f.slice(0, 4096).text()).replace(/^﻿/, '').split(/\r?\n/)[0] ?? '';
    const columns = head.split(',').map((c) => c.trim().replace(/^"|"$/g, '').toLowerCase());
    const missing = REQUIRED.filter((c) => !columns.includes(c));
    if (missing.length) return this.fileError.set(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);

    this.file.set(f);
  }

  protected removeFile(): void {
    if (!this.busy) {
      this.file.set(null);
      this.fileError.set('');
    }
  }

  protected downloadTemplate(): void {
    const header = [...REQUIRED, ...OPTIONAL].join(',');
    const sample = ['P-1002', 'NORTHWIND', 'NW-PPO-GOLD', 'MRI-LSPINE-001', '2026-11-02', 'MRI lumbar spine without contrast', 'M54.16', 'Radiculopathy lumbar region', 'Dr. Demo Clinician', ''].join(',');
    const url = URL.createObjectURL(new Blob([`${header}\n${sample}\n`], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cases-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  protected size(f: File): string {
    return f.size < 1024 ? `${f.size} B` : `${(f.size / 1024).toFixed(1)} KB`;
  }

  // ------------------------------------------------------------ upload

  protected async start(): Promise<void> {
    const f = this.file();
    if (!f || this.busy) return;
    const analyze = this.analyze();

    this.failure.set('');
    this.phase.set('uploading');
    this.startClock();
    try {
      let res = await firstValueFrom(this.api.uploadCases(f, analyze));

      if (analyze && res.job_id) {
        this.phase.set('processing');
        res = await this.waitForJob(res.job_id);
      }
      this.finish(res);
    } catch (e) {
      this.fail(toApiError(e).message, e);
    }
  }

  private async waitForJob(jobId: string): Promise<BulkUploadResponse> {
    const started = Date.now();
    while (!this.destroyed) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      const job = await firstValueFrom(this.api.getUploadJob(jobId));
      const status = String(job.status ?? '').toLowerCase();
      if (status === 'completed') return job;
      if (status === 'failed' || status === 'error') {
        throw new Error(String(job['error'] ?? job['message'] ?? 'The analysis job failed.'));
      }
      if (Date.now() - started > POLL_LIMIT_MS) throw new Error('The analysis job is taking too long. Check the cases list later.');
    }
    throw new Error('Cancelled.');
  }

  private finish(res: BulkUploadResponse): void {
    const data = res.result ?? res;
    const created = Array.isArray(data.created) ? data.created : [];
    const errors = Array.isArray(data.errors) ? data.errors : [];

    this.createdCount.set(created.length);
    this.createdIds.set(
      created
        .map((c) => (typeof c === 'string' ? c : ((c as { case_id?: string })?.case_id ?? '')))
        .filter(Boolean),
    );
    this.rowErrors.set(errors.map(toRowError));
    this.stopClock();
    this.phase.set('done');
    if (created.length) this.uploaded.emit();
  }

  private fail(message: string, err: unknown): void {
    this.stopClock();
    const status = toApiError(err).status;
    this.failure.set(
      status === 403
        ? `${message} Bulk upload needs the staff role.`
        : message,
    );
    this.phase.set('failed');
  }

  protected again(): void {
    this.file.set(null);
    this.fileError.set('');
    this.phase.set('select');
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

/** The API's error items are not documented; accept a string or an object with common field names. */
function toRowError(e: unknown): RowError {
  if (typeof e === 'string') return { row: '', message: e };
  const o = (e ?? {}) as Record<string, unknown>;
  const row = o['row'] ?? o['row_number'] ?? o['line'] ?? o['index'] ?? '';
  const field = o['field'] ? `${String(o['field'])}: ` : '';
  const msg = o['message'] ?? o['error'] ?? o['detail'] ?? o['msg'] ?? o['errors'] ?? JSON.stringify(o);
  const text = Array.isArray(msg) ? msg.map(String).join('; ') : String(msg);
  return { row: String(row), message: field + text };
}
