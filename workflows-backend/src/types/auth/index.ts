export interface JWTPayload {
  credentials: string;
  iat: number;
  exp: number;
}

