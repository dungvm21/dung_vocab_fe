import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AuthRequest, AuthResponse, RegisterRequest, TokenRefreshRequest } from '../models/auth.model';
import { User } from '../models/user.model';

const TOKEN_KEY = 'quizlet_fe.token';
const REFRESH_KEY = 'quizlet_fe.refreshToken';
const USER_KEY = 'quizlet_fe.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/auth`;

  /** Raw short-lived JWT or null when logged out. */
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  /** Raw opaque refresh token — the credential for /refresh and /logout. */
  readonly refreshToken = signal<string | null>(localStorage.getItem(REFRESH_KEY));

  /** Current user or null when logged out. */
  readonly currentUser = signal<User | null>(this.restoreUser());

  readonly isLoggedIn = computed(() => this.token() !== null);

  login(credentials: AuthRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, credentials)
      .pipe(tap((response) => this.storeSession(response)));
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, payload)
      .pipe(tap((response) => this.storeSession(response)));
  }

  /**
   * Exchanges the stored refresh token for a fresh token pair.
   * Backend rotates: the presented token is burnt on success, and replaying
   * a burnt token revokes every session of the user — hence single-flight
   * sharing happens in the interceptor, never here.
   */
  refresh(): Observable<AuthResponse> {
    const raw = this.refreshToken();
    if (!raw) {
      return throwError(() => new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'));
    }
    const payload: TokenRefreshRequest = { refreshToken: raw };
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/refresh`, payload)
      .pipe(tap((response) => this.storeSession(response)));
  }

  /** Clears the local session and best-effort revokes the refresh token server-side. */
  logout(): void {
    const raw = this.refreshToken();
    if (raw) {
      // Fire-and-forget — the local session must die even if the network fails.
      this.http.post(`${this.baseUrl}/logout`, { refreshToken: raw } satisfies TokenRefreshRequest)
        .subscribe({ error: () => undefined });
    }
    this.clearSession();
  }

  private storeSession(response: AuthResponse): void {
    const user: User = {
      id: response.id,
      username: response.username,
      email: response.email,
      role: response.role,
    };
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_KEY, response.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.token.set(response.accessToken);
    this.refreshToken.set(response.refreshToken);
    this.currentUser.set(user);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
  }

  private restoreUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
