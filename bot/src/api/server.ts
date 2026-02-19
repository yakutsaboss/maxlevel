import express, { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { userRouter } from './routes/users.js';
import { questRouter } from './routes/quests.js';
// [MVP-DISABLED] import { achievementRouter } from './routes/achievements.js';
import { modeRouter } from './routes/modes.js';
// [MVP-DISABLED] import { adminRouter } from './routes/admin.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { onboardingRouter } from './routes/onboarding.js';
import { checkinRouter } from './routes/checkins.js';
// [MVP-DISABLED] import { punishmentRouter } from './routes/punishment.js';
// [MVP-DISABLED] import { paymentsRouter } from './routes/payments.js';
// [MVP-DISABLED] import { socialRouter } from './routes/social.js';
// [MVP-DISABLED] import { avatarRouter } from './routes/avatars.js';
// [MVP-DISABLED] import { trophyRouter } from './routes/trophies.js';
// [MVP-DISABLED] import { shopRouter } from './routes/shop.js';
// [MVP-DISABLED] import { inventoryRouter } from './routes/inventory.js';
// [MVP-DISABLED] import { analyticsRouter } from './routes/analytics.js';
// [MVP-DISABLED] import { exportRouter } from './routes/export.js';
// [MVP-DISABLED] import { financeRouter } from './routes/finance.js';
// [MVP-DISABLED] import { channelRouter } from './routes/channel.js';
// [MVP-DISABLED] import { activityRouter } from './routes/activities.js';
// [MVP-DISABLED] import { contentRouter } from './routes/content.js';
// [MVP-DISABLED] import { recommendationsRouter } from './routes/recommendations.js';
import { healthRouter } from './routes/health.js';
import { metricsRouter, collectMetrics } from './routes/metrics.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { requestTimeout } from './middleware/timeout.js';
import { errorReporter } from './middleware/errorReporter.js';
import { ApiError } from './utils/errors.js';
import { logger, generateRequestId } from '../utils/logger.js';

const app: Express = express();
const PORT = process.env.API_PORT || 3000;
const BUILD_VERSION = process.env.BUILD_VERSION || 'dev';
const BUILD_TIMESTAMP = process.env.BUILD_TIMESTAMP || new Date().toISOString();

// Trust nginx reverse proxy (required for correct req.ip behind proxy)
app.set('trust proxy', 1);

// Compression — reduces response size by 60-80% for JSON APIs
app.use(compression());

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow mini app to load scripts/styles
}));

// CORS — never fall back to wildcard '*'
const allowedOrigins = [
  process.env.MINI_APP_URL,
  'https://yakutsa.ru',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:3002' : null,
].filter(Boolean) as string[];

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-telegram-init-data'],
}));

// Body parsing with size limit to prevent abuse
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Request logging — compact format in production
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Request context — assign requestId and log request start/finish with duration
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestId = generateRequestId();
  const start = Date.now();
  const log = logger.child({ requestId: req.requestId });

  log.info('Request start', { method: req.method, path: req.path, ip: req.ip });

  res.on('finish', () => {
    const duration = Date.now() - start;
    log.info('Request finish', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
});

// Request timeout (504 after 30s, warn on slow > 5s)
app.use(requestTimeout(30000));

// Metrics collection (before rate limiting so all requests are counted)
app.use(collectMetrics);

// Rate limiting (applied to all API routes)
app.use('/api', apiLimiter);

// Health check endpoint (no rate limit, no auth)
app.use(healthRouter);

// Metrics endpoint (Prometheus-compatible)
app.use('/api', metricsRouter);

// API Routes
app.use('/api/users', userRouter);
app.use('/api/quests', questRouter);
// [MVP-DISABLED] app.use('/api/achievements', achievementRouter);
app.use('/api/modes', modeRouter);
// [MVP-DISABLED] app.use('/api/admin', adminRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/checkins', checkinRouter);
// [MVP-DISABLED] app.use('/api/punishment', punishmentRouter);
// [MVP-DISABLED] app.use('/api/payments', paymentsRouter);
// [MVP-DISABLED] app.use('/api/social', socialRouter);
// [MVP-DISABLED] app.use('/api/avatars', avatarRouter);
// [MVP-DISABLED] app.use('/api/trophies', trophyRouter);
// [MVP-DISABLED] app.use('/api/shop', shopRouter);
// [MVP-DISABLED] app.use('/api/inventory', inventoryRouter);
// [MVP-DISABLED] app.use('/api/analytics', analyticsRouter);
// [MVP-DISABLED] app.use('/api/export', exportRouter);
// [MVP-DISABLED] app.use('/api/finance', financeRouter);
// [MVP-DISABLED] app.use('/api/channel', channelRouter);
// [MVP-DISABLED] app.use('/api/activities', activityRouter);
// [MVP-DISABLED] app.use('/api/content', contentRouter);
// [MVP-DISABLED] app.use('/api/recommendations', recommendationsRouter);

// Webhook route (mounted dynamically when webhook handler is provided)
let _webhookMounted = false;
export function mountWebhook(handler: RequestHandler): void {
  if (!_webhookMounted) {
    app.post('/webhook', handler);
    _webhookMounted = true;
    logger.info('Webhook mounted: POST /webhook');
  }
}

// Serve Mini App static files
const miniAppPath = path.join(__dirname, '..', '..', '..', 'mini-app', 'dist');

// Start server
export function startApiServer(webhookHandler?: RequestHandler): Promise<http.Server> {
  // Mount webhook route BEFORE catch-all handlers
  if (webhookHandler) {
    mountWebhook(webhookHandler);
  }

  // Root placeholder
  app.get('/', (req: Request, res: Response) => {
    res.status(200).send('<!DOCTYPE html><html><head><meta charset="utf-8"><title>yakutsa.ru</title></head><body><h1>yakutsa.ru</h1><p>Coming soon.</p></body></html>');
  });

  // Serve Mini App at /levelapp with caching headers for static assets
  app.use('/levelapp', express.static(miniAppPath, {
    maxAge: '1d',              // Cache static assets for 1 day
    etag: true,
    immutable: false,
  }));

  // SPA fallback for /levelapp routes (React Router)
  app.get('/levelapp/*', (req: Request, res: Response, next: NextFunction) => {
    res.sendFile(path.join(miniAppPath, 'index.html'), (err) => {
      if (err) {
        next();
      }
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // Error monitoring (logs + stats before the global handler)
  app.use(errorReporter);

  // Global error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }

    logger.error('Unhandled error', err, { requestId: req.requestId, method: req.method, path: req.path });
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    });
  });

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      logger.info('API Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        corsOrigins: allowedOrigins,
      });
      resolve(server);
    });

    // Set keep-alive timeout higher than nginx default (60s)
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;
  });
}

// Export app for testing
export { app };
