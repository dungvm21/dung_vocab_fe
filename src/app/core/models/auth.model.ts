/** Payload for POST /api/auth/login — accepts username OR email. */
export interface AuthRequest {
  usernameOrEmail: string;
  password: string;
}

/** Payload for POST /api/auth/register. Password: 8–100 chars. */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/** Response for successful register/login/refresh (backend AuthResponse). */
export interface AuthResponse {
  /** Short-lived signed JWT. */
  accessToken: string;
  /** Opaque, rotatable — sent to /api/auth/refresh when the access token expires. */
  refreshToken: string;
  /** e.g. "Bearer" */
  tokenType: string;
  id: number;
  username: string;
  email: string;
  role: string;
}

/** Payload for POST /api/auth/refresh and POST /api/auth/logout. */
export interface TokenRefreshRequest {
  refreshToken: string;
}
