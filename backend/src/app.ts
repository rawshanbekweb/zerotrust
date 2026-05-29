import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { config } from './config/index.js';
import { log } from './utils/logger.js';
import { generalLimiter } from './middleware/rate-limit.middleware.js';
import { auditInterceptor } from './middleware/audit.middleware.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';
import routes from './routes/index.js';

export function createApp(): express.Application {
  const app = express();

  // ─── SECURITY HEADERS ─────────────────────────────────────
  // Helmet sets a battery of secure HTTP headers.
  // CSP is configured explicitly to allow our frontend origin.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc:     ["'self'"],
          scriptSrc:      ["'self'"],
          styleSrc:       ["'self'", "'unsafe-inline'"],
          imgSrc:         ["'self'", 'data:', 'https:'],
          connectSrc:     ["'self'", ...config.cors.allowedOrigins],
          fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
          objectSrc:      ["'none'"],
          upgradeInsecureRequests: config.app.isProduction ? [] : null,
        },
      },
      hsts: config.app.isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ─── CORS ─────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) { callback(null, true); return; }

        if (config.cors.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          log.warn('CORS blocked', { origin });
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
    }),
  );

  // ─── BODY PARSING & COMPRESSION ───────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(compression());

  // ─── REQUEST LOGGING ──────────────────────────────────────
  app.use(
    morgan(config.app.isDevelopment ? 'dev' : 'combined', {
      stream: { write: (msg) => log.http(msg.trim()) },
      skip:   (_req, res) => res.statusCode < 400 && !config.app.isDevelopment,
    }),
  );

  // ─── GLOBAL RATE LIMIT ────────────────────────────────────
  app.use('/api/', generalLimiter);

  // ─── AUDIT INTERCEPTOR ────────────────────────────────────
  app.use(auditInterceptor);

  // ─── TRUST PROXY (for accurate IPs behind Nginx) ──────────
  if (config.app.isProduction) {
    app.set('trust proxy', 1);
  }

  // ─── ROUTES ───────────────────────────────────────────────
  app.use(routes);

  // ─── 404 & ERROR HANDLERS ─────────────────────────────────
  // These MUST be last — Express matches middleware in order
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
