import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { JwtPayload } from '../types/index.js';
import { UnauthorizedError } from './api-response.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // seconds until access token expires
}

export function generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenPair {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as any,
    algorithm: 'HS256',
  });

  const refreshToken = jwt.sign(
    { sub: payload.sub },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as any, algorithm: 'HS256' },
  );

  // Parse the expiry so the frontend knows when to refresh without decoding the token
  const expiresIn = parseExpiresIn(config.jwt.accessExpiresIn);

  return { accessToken, refreshToken, expiresIn };
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'sub'> {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as Pick<JwtPayload, 'sub'>;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expired — please log in again');
    }
    throw new UnauthorizedError('Invalid refresh token');
  }
}

export function decodeTokenUnsafe(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

// Convert express-style duration strings (15m, 7d) to seconds
function parseExpiresIn(duration: string): number {
  const unit  = duration.at(-1) ?? 's';
  const value = parseInt(duration.slice(0, -1), 10);
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 1);
}
