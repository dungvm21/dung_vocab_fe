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

/** Response for successful register/login (backend AuthResponse). */
export interface AuthResponse {
  accessToken: string;
  /** e.g. "Bearer" */
  tokenType: string;
  id: number;
  username: string;
  email: string;
  role: string;
}
