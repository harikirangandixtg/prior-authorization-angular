import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  status: number;
  /** One readable message, safe to show in the UI. */
  message: string;
  /** FastAPI validation errors keyed by field name (from `loc`), e.g. { order_date: 'order_date must be YYYY-MM-DD' }. */
  fieldErrors: Record<string, string>;
}

interface FastApiDetailItem {
  loc?: (string | number)[];
  msg?: string;
}

/** Turns any HTTP failure into a readable message. Understands FastAPI's `{ detail: string | [{loc, msg}] }`. */
export function toApiError(err: unknown): ApiError {
  if (!(err instanceof HttpErrorResponse)) {
    return { status: -1, message: err instanceof Error ? err.message : 'Something went wrong.', fieldErrors: {} };
  }

  if (err.status === 0) {
    return {
      status: 0,
      message: 'Cannot reach the Authorization API. Check that it is running and that proxy.conf.json points to it.',
      fieldErrors: {},
    };
  }

  const detail = (err.error as { detail?: unknown } | null)?.detail;

  if (typeof detail === 'string') {
    return { status: err.status, message: detail, fieldErrors: {} };
  }

  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string> = {};
    const lines: string[] = [];
    for (const item of detail as FastApiDetailItem[]) {
      const field = (item.loc ?? []).filter((p) => p !== 'body' && p !== 'query').join('.');
      const msg = (item.msg ?? 'Invalid value').replace(/^Value error,\s*/i, '');
      if (field) fieldErrors[field] = msg;
      lines.push(field ? `${field}: ${msg}` : msg);
    }
    return { status: err.status, message: lines.join(' · ') || 'The request was rejected.', fieldErrors };
  }

  if (err.status >= 500) {
    return { status: err.status, message: 'The server hit an error. Try again, and check the API logs if it persists.', fieldErrors: {} };
  }
  return { status: err.status, message: err.message || `Request failed (HTTP ${err.status}).`, fieldErrors: {} };
}
