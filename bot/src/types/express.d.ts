/**
 * Extended Express types for Telegram authentication and admin auth
 */

import { TelegramUser } from './telegram.js';
import { AdminUser } from '../api/middleware/adminAuth.js';

declare global {
  namespace Express {
    interface Request {
      /**
       * Unique request ID for tracing, set by request context middleware
       */
      requestId?: string;

      /**
       * Telegram user data attached by authenticateTelegram middleware
       */
      telegramUser?: TelegramUser;

      /**
       * Database user data attached by authorizeUser middleware
       */
      dbUser?: {
        id: number;
        telegram_id: number;
        username: string | null;
        first_name: string | null;
        current_level: number;
        total_xp: number;
        timezone: string;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      };

      /**
       * Admin user data attached by authenticateAdmin middleware
       */
      adminUser?: AdminUser;
    }
  }
}

export {};
