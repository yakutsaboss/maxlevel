/**
 * Extended Express types for Telegram authentication
 */

import { TelegramUser } from './telegram';

declare global {
  namespace Express {
    interface Request {
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
    }
  }
}

export {};
