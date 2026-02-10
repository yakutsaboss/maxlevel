import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { TelegramUser, TelegramInitData } from '../../types/telegram.js';
import { queryOne } from '../../utils/db.js';
import { logger } from '../utils/logger.js';

const authLog = logger.child({ component: 'auth' });

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
    authLog.error('Error validating Telegram data', error as Error);
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
    authLog.error('Error parsing Telegram data', error as Error);
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
    authLog.warn('Authentication skipped (development mode)', { ip, requestId: req.requestId });
    return next();
  }

  const initData = req.headers['x-telegram-init-data'] as string;

  if (!initData) {
    authLog.warn('Auth failed: missing init data', { ip, requestId: req.requestId });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Telegram authentication data',
    });
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    authLog.error('TELEGRAM_BOT_TOKEN not configured', undefined, { requestId: req.requestId });
    res.status(500).json({
      error: 'Server Error',
      message: 'Bot token not configured',
    });
    return;
  }

  // Validate the data
  const isValid = validateTelegramWebAppData(initData, botToken);

  if (!isValid) {
    authLog.warn('Auth failed: invalid signature', { ip, requestId: req.requestId });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Telegram authentication data',
    });
    return;
  }

  // Parse and attach user data to request
  const parsedData = parseTelegramInitData(initData);

  if (!parsedData || !parsedData.user) {
    authLog.warn('Auth failed: invalid user data', { ip, requestId: req.requestId });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid user data',
    });
    return;
  }

  // Check auth_date (data should not be older than 1 hour)
  const authAge = Date.now() / 1000 - parsedData.auth_date;
  if (authAge > 3600) { // 1 hour
    authLog.warn('Auth failed: expired', { ip, telegramUserId: parsedData.user.id, requestId: req.requestId });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication data expired',
    });
    return;
  }

  // Attach user info to request
  req.telegramUser = parsedData.user;

  const duration = Date.now() - startTime;
  authLog.info('Auth success', { ip, telegramUserId: parsedData.user.id, durationMs: duration, requestId: req.requestId });

  next();
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
      authLog.warn('User not found in database', { telegramUserId: telegramUser.id, requestId: req.requestId });
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found in database',
      });
      return;
    }

    // Check if user is active
    if (!dbUser.is_active) {
      authLog.warn('Inactive user access attempt', { userId: dbUser.id, requestId: req.requestId });
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
      authLog.warn('Resource ownership mismatch', {
        telegramUserId: telegramUser.id, requestedUser: userId, actualUser: dbUser.id, requestId: req.requestId,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    // If route has telegramId parameter, verify it matches
    if (telegramId && parseInt(telegramId) !== telegramUser.id) {
      authLog.warn('Telegram ID mismatch', {
        authenticatedId: telegramUser.id, requestedId: telegramId, requestId: req.requestId,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    // Attach database user to request for use in route handlers
    req.dbUser = dbUser;

    authLog.info('User authorized', { userId: dbUser.id, telegramUserId: telegramUser.id, requestId: req.requestId });
    next();
  } catch (error) {
    authLog.error('Authorization error', error as Error, { requestId: req.requestId });
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to authorize user',
    });
  }
}
