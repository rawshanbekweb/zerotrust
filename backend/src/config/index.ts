import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Zod validates every env var at startup.
// If any required variable is missing, the app crashes with a clear message
// instead of failing silently with a runtime error 20 minutes later.
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_VERSION: z.string().default('v1'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  ENCRYPTION_KEY: z.string().optional(),
});

const parseResult = EnvSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parseResult.error.format());
  process.exit(1);
}

const env = parseResult.data;

export const config = {
  app: {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    apiVersion: env.API_VERSION,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
  },
  database: {
    url: env.DATABASE_URL,
  },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  cors: {
    allowedOrigins: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  encryption: {
    key: env.ENCRYPTION_KEY,
  },
} as const;

export type AppConfig = typeof config;
