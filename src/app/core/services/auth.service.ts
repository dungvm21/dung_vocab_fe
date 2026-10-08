import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthRequest, AuthResponse, RegisterRequest } from '../models/auth.model';
import { User } from '../models/user.model';

const TOKEN_KEY = 'quizlet_fe.token';
const USER_KEY = 'quizlet_fe.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/auth`;

  /** Raw JWT or null when logged out. */
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

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

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  private storeSession(response: AuthResponse): void {
    const user: User = {
      id: response.id,
      username: response.username,
      email: response.email,
      role: response.role,
    };
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.token.set(response.accessToken);
    this.currentUser.set(user);
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
