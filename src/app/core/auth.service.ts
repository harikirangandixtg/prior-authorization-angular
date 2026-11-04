import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, AuthUser, ResetPasswordRequest, Role, SignupRequest } from './models';

const STORAGE_KEY = 'pa.session';

interface Session {
  token: string;
  expiresAt: number; // epoch ms
  user: AuthUser;
}

/**
 * Where the login lives. sessionStorage: the login ends when the tab is closed, which suits patient data.
 * To keep people signed in across tabs and restarts, change this one line to `localStorage`.
 */
const store = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

function loadSession(): Session | null {
  try {
    const raw = store()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s?.token && s.expiresAt > Date.now() && s.user ? s : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.authBaseUrl;

  private readonly session = signal<Session | null>(loadSession());
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  /**
   * What each role may do: the ONE place to change. Templates read these flags, so a screen never
   * checks role names itself. Someone with both roles gets everything.
   */
  readonly perms = computed(() => {
    const roles = this.user()?.roles ?? [];
    const requester = roles.includes('requester');
    const reviewer = roles.includes('reviewer');
    return {
      createRequests: requester, // New request, Start request from Policy search
      bulkUpload: requester, // Bulk upload on Cases
      runAnalysis: requester, // Run / Re-run analysis
      review: reviewer, // Accept or correct findings
    };
  });
  readonly hasAllPatients = computed(() => this.user()?.allowed_patients?.includes('*') ?? false);

  constructor() {
    this.scheduleExpiry();
  }

  // ---------------------------------------------------------------- API calls

  /** POST /api/auth/signup (201 returns a token, so the user is signed in straight away) */
  signup(body: SignupRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/signup`, body).pipe(tap((r) => this.start(r)));
  }

  /** POST /api/auth/login */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password }).pipe(tap((r) => this.start(r)));
  }

  /** POST /api/auth/password (always answers ok, even for unknown emails) */
  resetPassword(body: ResetPasswordRequest): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(`${this.base}/password`, body);
  }

  /** GET /api/auth/me: refreshes the stored user (roles may have changed). A 401 signs the user out via the interceptor. */
  refresh(): void {
    if (!this.isLoggedIn()) return;
    this.http.get<AuthUser>(`${this.base}/me`).subscribe({
      next: (user) => {
        const s = this.session();
        if (s) this.save({ ...s, user });
      },
      error: () => undefined, // 401 is handled by the interceptor; other errors keep the current session
    });
  }

  // ---------------------------------------------------------------- session

  logout(): void {
    this.clear();
    void this.router.navigate(['/login']);
  }

  /** Called when the API says the token is no longer valid. */
  expire(returnUrl: string): void {
    if (!this.isLoggedIn()) return;
    this.clear();
    void this.router.navigate(['/login'], { queryParams: { expired: 1, returnUrl } });
  }

  private start(r: AuthResponse): void {
    this.save({ token: r.access_token, expiresAt: Date.now() + r.expires_in * 1000, user: r.user });
  }

  private save(s: Session): void {
    this.session.set(s);
    try {
      store()?.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable: the login lasts until the page is reloaded */
    }
    this.scheduleExpiry();
  }

  private clear(): void {
    this.session.set(null);
    try {
      store()?.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    this.scheduleExpiry();
  }

  private scheduleExpiry(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    const s = this.session();
    if (!s) return;
    const ms = Math.min(Math.max(s.expiresAt - Date.now(), 0), 2_000_000_000);
    this.expiryTimer = setTimeout(() => this.expire(this.router.url), ms);
  }

  // ---------------------------------------------------------------- permissions

  can(role: Role): boolean {
    return this.user()?.roles?.includes(role) ?? false;
  }

  canAccessPatient(patientId: string): boolean {
    const allowed = this.user()?.allowed_patients ?? [];
    return allowed.includes('*') || allowed.includes(patientId);
  }

  get displayName(): string {
    const u = this.user();
    return u?.full_name?.trim() || u?.email || '';
  }
}
