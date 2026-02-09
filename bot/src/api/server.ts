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
import { achievementRouter } from './routes/achievements.js';
import { modeRouter } from './routes/modes.js';
import { adminRouter } from './routes/admin.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { onboardingRouter } from './routes/onboarding.js';
import { checkinRouter } from './routes/checkins.js';
import { punishmentRouter } from './routes/punishment.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const app: Express = express();
const PORT = process.env.API_PORT || 3000;

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

// Rate limiting (applied to all API routes)
app.use('/api', apiLimiter);

// Health check endpoint (no rate limit, no auth)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/users', userRouter);
app.use('/api/quests', questRouter);
app.use('/api/achievements', achievementRouter);
app.use('/api/modes', modeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/checkins', checkinRouter);
app.use('/api/punishment', punishmentRouter);

// Webhook route (mounted dynamically when webhook handler is provided)
let _webhookMounted = false;
export function mountWebhook(handler: RequestHandler): void {
  if (!_webhookMounted) {
    app.post('/webhook', handler);
    _webhookMounted = true;
    console.log('   POST /webhook (Telegram webhook)');
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

  // Global error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    });
  });

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`\n🌐 API Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 CORS enabled for: ${allowedOrigins.join(', ') || 'none'}`);
      console.log(`\n📍 Available endpoints:`);
      console.log(`   GET  /health`);
      console.log(`   GET  /api/users/:telegramId/stats`);
      console.log(`   GET  /api/users/:userId/quests/active`);
      console.log(`   GET  /api/users/:userId/quests/completed`);
      console.log(`   POST /api/quests/:questId/complete`);
      console.log(`   GET  /api/users/:userId/achievements`);
      console.log(`   GET  /api/achievements`);
      console.log(`   POST /api/users/:userId/modes`);
      console.log(`   DELETE /api/users/:userId/modes/:modeId\n`);
      resolve(server);
    });

    // Set keep-alive timeout higher than nginx default (60s)
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;
  });
}

// Export app for testing
export { app };
