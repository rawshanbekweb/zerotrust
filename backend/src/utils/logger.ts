import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

const logsDir = path.resolve('src/logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Human-readable format for development console
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${String(ts)} [${level}] ${String(message)}${metaStr}${stack ? `\n${String(stack)}` : ''}`;
  }),
);

// Structured JSON format for production / log aggregation
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

export const logger = winston.createLogger({
  level: config.app.isDevelopment ? 'debug' : 'info',
  format: config.app.isDevelopment ? devFormat : prodFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,  // 10 MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

// Convenience wrapper — keeps call sites clean
export const log = {
  info:  (msg: string, meta?: Record<string, unknown>) => logger.info(msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => logger.warn(msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => logger.error(msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => logger.debug(msg, meta),
  http:  (msg: string, meta?: Record<string, unknown>) => logger.http(msg, meta),
};
