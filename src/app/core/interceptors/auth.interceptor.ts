import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, share, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/** Error carrying the HTTP status — callers branch on 404 (deleted deck) etc. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Attaches the JWT bearer token to every API request and normalizes
 * backend errors into a message string on the thrown error.
 *
 * On a 401 from a business API (not the auth endpoints themselves) it
 * single-flights a POST /api/auth/refresh, stores the new token pair and
 * replays the original request. A dead refresh token logs the user out.
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/api/auth/') && // login/refresh 401s are terminal, not refreshable
        auth.refreshToken()
      ) {
        return handleSessionExpired(req, next, auth);
      }
      return throwError(() => toApiError(error));
    }),
  );
};

/** In-flight refresh shared by every 401 arriving at the same moment. */
let refreshRequest$: Observable<unknown> | null = null;

function handleSessionExpired(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
): Observable<HttpEvent<unknown>> {
  refreshRequest$ ??= auth.refresh().pipe(
    finalize(() => (refreshRequest$ = null)),
    share(),
  );

  return refreshRequest$.pipe(
    // refresh() already stored the new pair — read the fresh token and replay once.
    switchMap(() =>
      next(req.clone({ setHeaders: { Authorization: `Bearer ${auth.token()}` } })),
    ),
    catchError((error: unknown) => {
      // Refresh failed (expired/revoked token) — session is unrecoverable.
      auth.logout();
      inject(Router).navigate(['/login']);
      return throwError(() => toApiError(error, true));
    }),
  );
}

function toApiError(error: unknown, sessionExpired = false): ApiError {
  return new ApiError(
    toMessage(error, sessionExpired),
    error instanceof HttpErrorResponse ? error.status : 0,
  );
}

function toMessage(error: unknown, sessionExpired = false): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Không thể kết nối máy chủ. Backend đã chạy chưa?';
    if (error.status === 401) {
      return sessionExpired || error.url?.includes('/api/auth/refresh')
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : 'Sai tên đăng nhập hoặc mật khẩu.';
    }
    const backendMessage =
      (typeof error.error === 'object' && error.error !== null && 'message' in error.error
        ? String((error.error as { message: unknown }).message)
        : null) ?? error.error;
    if (typeof backendMessage === 'string' && backendMessage.length > 0) return backendMessage;
    return `Yêu cầu thất bại (${error.status}).`;
  }
  return 'Có lỗi không xác định.';
}
