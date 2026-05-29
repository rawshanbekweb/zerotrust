import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

// Different rate limit profiles for different endpoint sensitivity.
// Auth endpoints are tighter than general API endpoints to slow brute force.

export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max:      config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success:   false,
    error:     { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
    timestamp: new Date().toISOString(),
  },
});

// Auth endpoints: 10 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true,  // only count failures — legitimate users aren't penalized
  message: {
    success:   false,
    error:     { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Please wait 15 minutes.' },
    timestamp: new Date().toISOString(),
  },
});

// Password reset / MFA: very tight
export const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success:   false,
    error:     { code: 'RATE_LIMITED', message: 'Too many sensitive requests. Please wait 1 hour.' },
    timestamp: new Date().toISOString(),
  },
});
