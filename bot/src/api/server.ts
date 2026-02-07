import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { userRouter } from './routes/users.js';
import { questRouter } from './routes/quests.js';
import { achievementRouter } from './routes/achievements.js';
import { modeRouter } from './routes/modes.js';
import { adminRouter } from './routes/admin.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Load environment variables
config({ path: '.env.bot' });

const app: Express = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.MINI_APP_URL || '*',
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-telegram-init-data'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Request logging

// Rate limiting (applied to all routes except health check)
app.use('/api', apiLimiter);

// Health check endpoint
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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
export function startApiServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(PORT, () => {
      console.log(`\n🌐 API Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 CORS enabled for: ${process.env.MINI_APP_URL || '*'}`);
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
      resolve();
    });
  });
}

// Export app for testing
export { app };
