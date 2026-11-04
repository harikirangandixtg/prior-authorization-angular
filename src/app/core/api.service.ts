import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  AuditResponse,
  CaseRequest,
  DraftResponse,
  EvidenceResponse,
  BulkUploadResponse,
  PaCase,
  PolicyFilters,
  PolicySearchResponse,
  ReviewDecision,
} from './models';

/** Tracks whether the API is reachable, shown in the sidebar. Updated by the interceptor below. */
@Injectable({ providedIn: 'root' })
export class ConnectionState {
  readonly online = signal<boolean | null>(null); // null = not known yet
}

export const connectionInterceptor: HttpInterceptorFn = (req, next) => {
  const state = inject(ConnectionState);
  return next(req).pipe(
    tap({
      next: (event) => {
        if ('status' in event) state.online.set(true);
      },
      error: (err) => {
        if (err?.status === 0) state.online.set(false);
        else state.online.set(true); // server answered, even if with an error
      },
    }),
  );
};

@Injectable({ providedIn: 'root' })
export class AuthorizationApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** GET /policies?payer_id=&plan_id=&service_code=&query= (empty filters are not sent) */
  searchPolicies(filters: PolicyFilters): Observable<PolicySearchResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) if (v.trim()) params = params.set(k, v.trim());
    return this.http.get<PolicySearchResponse>(`${this.base}/policies`, { params });
  }

  /** POST /cases/upload?analyze=true|false  (multipart, form field `file`) */
  uploadCases(file: File, analyze: boolean): Observable<BulkUploadResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<BulkUploadResponse>(`${this.base}/cases/upload?analyze=${analyze}`, form);
  }

  /** GET /cases/upload/jobs/{job_id} */
  getUploadJob(jobId: string): Observable<BulkUploadResponse> {
    return this.http.get<BulkUploadResponse>(`${this.base}/cases/upload/jobs/${encodeURIComponent(jobId)}`);
  }

  /** GET /cases */
  listCases(): Observable<PaCase[]> {
    return this.http.get<PaCase[]>(`${this.base}/cases`);
  }

  /** POST /cases */
  createCase(request: CaseRequest): Observable<PaCase> {
    return this.http.post<PaCase>(`${this.base}/cases`, request);
  }

  /** GET /cases/{id} */
  getCase(id: string): Observable<PaCase> {
    return this.http.get<PaCase>(`${this.base}/cases/${encodeURIComponent(id)}`);
  }

  /** POST /cases/{id}/analyze (can take 30s+: the AI model is called) */
  analyze(id: string): Observable<PaCase> {
    return this.http.post<PaCase>(`${this.base}/cases/${encodeURIComponent(id)}/analyze`, {});
  }

  /** GET /cases/{id}/evidence */
  getEvidence(id: string): Observable<EvidenceResponse> {
    return this.http.get<EvidenceResponse>(`${this.base}/cases/${encodeURIComponent(id)}/evidence`);
  }

  /** GET /cases/{id}/draft */
  getDraft(id: string): Observable<DraftResponse> {
    return this.http.get<DraftResponse>(`${this.base}/cases/${encodeURIComponent(id)}/draft`);
  }

  /** GET /cases/{id}/audit */
  getAudit(id: string): Observable<AuditResponse> {
    return this.http.get<AuditResponse>(`${this.base}/cases/${encodeURIComponent(id)}/audit`);
  }

  /**
   * POST /cases/{id}/review
   *
   * ASSUMED REQUEST BODY: the API notes list no body for this endpoint (only a 404 sample).
   * If the real schema differs, change ONLY `toReviewPayload` below. The UI will show the server's
   * validation message (field names it expects) when the body is rejected.
   * The response shape is not relied on: the caller re-fetches the case afterwards.
   */
  submitReview(id: string, review: ReviewDecision): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.base}/cases/${encodeURIComponent(id)}/review`,
      toReviewPayload(review),
    );
  }
}

function toReviewPayload(review: ReviewDecision): Record<string, unknown> {
  const body: Record<string, unknown> = { decision: review.decision };
  if (review.comments) body['comments'] = review.comments;
  if (review.decision === 'CORRECTED') body['corrected_narrative'] = review.corrected_narrative;
  return body;
}
