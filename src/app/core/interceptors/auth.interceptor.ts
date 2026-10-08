import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Attaches the JWT bearer token to every API request and normalizes
 * backend errors into a message string on the thrown error.
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(catchError((error: unknown) => throwError(() => toMessage(error))));
};

function toMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Cannot reach the server. Is the backend running?';
    if (error.status === 401) return 'Invalid username or password.';
    const backendMessage =
      (typeof error.error === 'object' && error.error !== null && 'message' in error.error
        ? String((error.error as { message: unknown }).message)
        : null) ?? error.error;
    if (typeof backendMessage === 'string' && backendMessage.length > 0) return backendMessage;
    return `Request failed (${error.status}).`;
  }
  return 'Something went wrong.';
}
