import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { TelegramUser, TelegramInitData } from '../../types/telegram.js';
import { queryOne } from '../../utils/db.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Validates Telegram WebApp initData
 * Based on: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramWebAppData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      return false;
    }

    // Remove hash from params
    urlParams.delete('hash');

    // Sort params alphabetically and create data-check-string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Compare hashes
    return calculatedHash === hash;
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return false;
  }
}

/**
 * Parse Telegram initData into structured object
 */
export function parseTelegramInitData(initData: string): TelegramInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const userData = urlParams.get('user');

    return {
      query_id: urlParams.get('query_id') || undefined,
      user: userData ? JSON.parse(userData) : undefined,
      auth_date: parseInt(urlParams.get('auth_date') || '0'),
      hash: urlParams.get('hash') || '',
    };
  } catch (error) {
    console.error('Error parsing Telegram data:', error);
    return null;
  }
}

/**
 * Middleware to validate Telegram authentication
 */
export function authenticateTelegram(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const ip = req.ip || req.socket.remoteAddress;

  // Skip authentication in development if specified
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    console.warn(`⚠️  [AUTH] Authentication skipped (development mode) - IP: ${ip}`);
    return next();
  }

  const initData = req.headers['x-telegram-init-data'] as string;

  if (!initData) {
    logAuthAttempt('failed', 'missing_init_data', ip);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Telegram authentication data',
    });
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error('[AUTH] TELEGRAM_BOT_TOKEN not configured');
    res.status(500).json({
      error: 'Server Error',
      message: 'Bot token not configured',
    });
    return;
  }

  // Validate the data
  const isValid = validateTelegramWebAppData(initData, botToken);

  if (!isValid) {
    logAuthAttempt('failed', 'invalid_signature', ip);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Telegram authentication data',
    });
    return;
  }

  // Parse and attach user data to request
  const parsedData = parseTelegramInitData(initData);

  if (!parsedData || !parsedData.user) {
    logAuthAttempt('failed', 'invalid_user_data', ip);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid user data',
    });
    return;
  }

  // Check auth_date (data should not be older than 1 hour)
  const authAge = Date.now() / 1000 - parsedData.auth_date;
  if (authAge > 3600) { // 1 hour
    logAuthAttempt('failed', 'expired', ip, parsedData.user.id);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication data expired',
    });
    return;
  }

  // Attach user info to request
  req.telegramUser = parsedData.user;

  const duration = Date.now() - startTime;
  logAuthAttempt('success', undefined, ip, parsedData.user.id, duration);

  next();
}

/**
 * Log authentication attempt
 */
function logAuthAttempt(
  status: 'success' | 'failed',
  reason?: string,
  ip?: string,
  telegramUserId?: number,
  duration?: number
): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    status,
    ip,
    telegram_user_id: telegramUserId,
    reason,
    duration_ms: duration,
  };

  if (status === 'success') {
    console.log(`[AUTH SUCCESS] ${JSON.stringify(logData)}`);
  } else {
    console.warn(`[AUTH FAILED] ${JSON.stringify(logData)}`);
  }
}

/**
 * Middleware to authorize user access to resources
 * Verifies that the authenticated Telegram user owns the resource they're accessing
 */
export async function authorizeUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const telegramUser = req.telegramUser;

  if (!telegramUser) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  try {
    // Get user from database (native SQL — no Python subprocess)
    const dbUser = await queryOne<{
      id: number;
      telegram_id: number;
      username: string | null;
      first_name: string | null;
      avatar_id: number | null;
      current_level: number;
      total_xp: number;
      timezone: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, telegram_id, username, first_name, avatar_id,
              current_level, total_xp, timezone, is_active,
              created_at, updated_at
       FROM users WHERE telegram_id = $1`,
      [telegramUser.id]
    );

    if (!dbUser) {
      console.warn(`[AUTHZ] User not found in database: telegram_id=${telegramUser.id}`);
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found in database',
      });
      return;
    }

    // Check if user is active
    if (!dbUser.is_active) {
      console.warn(`[AUTHZ] Inactive user access attempt: user_id=${dbUser.id}`);
      res.status(403).json({
        error: 'Forbidden',
        message: 'User account is inactive',
      });
      return;
    }

    // Verify resource ownership
    const userId = req.params.userId;
    const telegramId = req.params.telegramId;

    // If route has userId parameter, verify it matches
    if (userId && parseInt(userId) !== dbUser.id) {
      console.warn(
        `[AUTHZ] Resource ownership mismatch: telegram_user=${telegramUser.id}, ` +
        `requested_user=${userId}, actual_user=${dbUser.id}`
      );
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    // If route has telegramId parameter, verify it matches
    if (telegramId && parseInt(telegramId) !== telegramUser.id) {
      console.warn(
        `[AUTHZ] Telegram ID mismatch: authenticated=${telegramUser.id}, requested=${telegramId}`
      );
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    // Attach database user to request for use in route handlers
    req.dbUser = dbUser;

    console.log(`[AUTHZ SUCCESS] User authorized: user_id=${dbUser.id}, telegram_id=${telegramUser.id}`);
    next();
  } catch (error) {
    console.error('[AUTHZ ERROR]', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to authorize user',
    });
  }
}

/**
 * Lightweight ownership check for :telegramId routes.
 * Compares the URL param to the authenticated Telegram user's ID.
 * Call as the FIRST line inside a handler after parsing the param.
 */
export function requireOwnership(req: Request): void {
  const paramId = parseInt(req.params.telegramId);
  const authId = req.telegramUser?.id;
  if (!authId || paramId !== authId) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }
}
