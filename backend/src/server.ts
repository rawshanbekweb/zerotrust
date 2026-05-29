import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './services/prisma.service.js';
import { log } from './utils/logger.js';
import { riskService } from './modules/risk/risk.service.js';
import { alertsService } from './modules/alerts/alerts.service.js';
import { incidentsService } from './modules/incidents/incidents.service.js';

async function bootstrap(): Promise<void> {
  // 1. Connect to database first — if this fails, the app should not start
  await connectDatabase();

  // 2. Create the Express app
  const app    = createApp();
  const server = http.createServer(app);

  // 3. Attach Socket.io (used in Phase 8 for real-time events)
  const io = new SocketServer(server, {
    cors: {
      origin:      config.cors.allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Basic socket auth middleware (placeholder — expanded in Phase 8)
  io.use((socket: any, next: any) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    next();
  });

  io.on('connection', (socket: any) => {
    log.debug('WebSocket connected', { id: socket.id });

    socket.on('disconnect', () => {
      log.debug('WebSocket disconnected', { id: socket.id });
    });
  });

  // Expose io for use in event emitters from services
  app.set('io', io);

  // Initialize service WebSocket instances
  riskService.setIo(io);
  alertsService.setIo(io);
  incidentsService.setIo(io);

  // 4. Start HTTP server
  server.listen(config.app.port, () => {
    log.info(`🛡️  ZeroTrust API running on port ${config.app.port}`);
    log.info(`📡 Environment: ${config.app.nodeEnv}`);
    log.info(`🔗 API Base: http://localhost:${config.app.port}/api/${config.app.apiVersion}`);
  });

  // 5. Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    log.info(`Received ${signal} — shutting down gracefully`);

    server.close(async () => {
      await disconnectDatabase();
      log.info('Server closed');
      process.exit(0);
    });

    // Force kill after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      log.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    log.error('Unhandled Promise rejection', { reason: String(reason) });
  });

  process.on('uncaughtException', (err) => {
    log.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
