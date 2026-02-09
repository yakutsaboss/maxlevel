/**
 * Tests for Telegram authentication middleware (bot/src/api/middleware/auth.ts)
 *
 * Tests:
 * - Valid signature passes
 * - Invalid signature returns 401
 * - Expired data returns 401
 * - Missing header returns 401
 * - Missing bot token returns 500
 * - parseTelegramInitData works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { mockRequest, mockResponse, mockNext, TEST_TELEGRAM_USER } from '../setup.js';

// ─── Mock pythonTools (used by authorizeUser) ────────────────────────

vi.mock('../../utils/pythonTools.js', () => ({
  getUserByTelegramId: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 1,
      telegram_id: 123456789,
      username: 'testuser',
      first_name: 'Test',
      is_active: true,
    },
  }),
  getUserById: vi.fn(),
}));

// ─── Import AFTER mocks ─────────────────────────────────────────────

import {
  validateTelegramWebAppData,
  parseTelegramInitData,
  authenticateTelegram,
} from '../../api/middleware/auth.js';

// ─── Helpers ─────────────────────────────────────────────────────────

const BOT_TOKEN = 'TEST_BOT_TOKEN_12345';

/**
 * Generate valid Telegram initData with correct HMAC signature.
 */
function generateInitData(user: object, authDate?: number): string {
  const params = new URLSearchParams();
  params.set('user', JSON.stringify(user));
  params.set('auth_date', (authDate ?? Math.floor(Date.now() / 1000)).toString());

  // Sort params
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Create hash
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();

  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  params.set('hash', hash);
  return params.toString();
}

// ─── Tests ───────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
  delete process.env.NODE_ENV;
  delete process.env.SKIP_AUTH;
});

afterEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN;
});

describe('validateTelegramWebAppData', () => {
  it('should return true for valid signature', () => {
    const initData = generateInitData(TEST_TELEGRAM_USER);
    const result = validateTelegramWebAppData(initData, BOT_TOKEN);
    expect(result).toBe(true);
  });

  it('should return false for invalid signature', () => {
    const initData = generateInitData(TEST_TELEGRAM_USER);
    const result = validateTelegramWebAppData(initData, 'WRONG_TOKEN');
    expect(result).toBe(false);
  });

  it('should return false when hash is missing', () => {
    const params = new URLSearchParams();
    params.set('user', JSON.stringify(TEST_TELEGRAM_USER));
    params.set('auth_date', Math.floor(Date.now() / 1000).toString());

    const result = validateTelegramWebAppData(params.toString(), BOT_TOKEN);
    expect(result).toBe(false);
  });

  it('should return false for tampered data', () => {
    const initData = generateInitData(TEST_TELEGRAM_USER);
    const tampered = initData.replace('testuser', 'hacker');
    const result = validateTelegramWebAppData(tampered, BOT_TOKEN);
    expect(result).toBe(false);
  });
});

describe('parseTelegramInitData', () => {
  it('should parse valid initData', () => {
    const initData = generateInitData(TEST_TELEGRAM_USER);
    const parsed = parseTelegramInitData(initData);

    expect(parsed).not.toBeNull();
    expect(parsed!.user).toBeDefined();
    expect(parsed!.user!.id).toBe(TEST_TELEGRAM_USER.id);
    expect(parsed!.user!.username).toBe('testuser');
    expect(parsed!.auth_date).toBeGreaterThan(0);
    expect(parsed!.hash).toBeTruthy();
  });

  it('should return null on malformed data', () => {
    const params = new URLSearchParams();
    params.set('user', '{not-json');
    params.set('auth_date', '12345');
    params.set('hash', 'abc');

    const result = parseTelegramInitData(params.toString());
    expect(result).toBeNull();
  });

  it('should handle missing user field', () => {
    const params = new URLSearchParams();
    params.set('auth_date', '12345');
    params.set('hash', 'abc');

    const result = parseTelegramInitData(params.toString());
    expect(result).not.toBeNull();
    expect(result!.user).toBeUndefined();
  });
});

describe('authenticateTelegram middleware', () => {
  it('should return 401 when init data is missing', () => {
    const req = mockRequest({ headers: {} });
    const res = mockResponse();
    const next = mockNext();

    authenticateTelegram(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Missing Telegram authentication data');
    expect(next.called).toBe(false);
  });

  it('should return 500 when bot token is not configured', () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    const req = mockRequest({
      headers: { 'x-telegram-init-data': 'some=data&hash=abc' },
    });
    const res = mockResponse();
    const next = mockNext();

    authenticateTelegram(req, res, next);

    expect(res._status).toBe(500);
    expect(res._json.message).toBe('Bot token not configured');
  });

  it('should return 401 for invalid signature', () => {
    const req = mockRequest({
      headers: { 'x-telegram-init-data': 'user=%7B%22id%22%3A1%7D&auth_date=12345&hash=invalidhash' },
    });
    const res = mockResponse();
    const next = mockNext();

    authenticateTelegram(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Invalid Telegram authentication data');
  });

  it('should return 401 for expired data (older than 1 hour)', () => {
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
    const initData = generateInitData(TEST_TELEGRAM_USER, twoHoursAgo);

    const req = mockRequest({
      headers: { 'x-telegram-init-data': initData },
    });
    const res = mockResponse();
    const next = mockNext();

    authenticateTelegram(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Authentication data expired');
  });

  it('should pass and attach user for valid data', () => {
    const initData = generateInitData(TEST_TELEGRAM_USER);

    const req = mockRequest({
      headers: { 'x-telegram-init-data': initData },
    });
    const res = mockResponse();
    const next = mockNext();

    authenticateTelegram(req, res, next);

    expect(next.called).toBe(true);
    expect(req.telegramUser).toBeDefined();
    expect(req.telegramUser!.id).toBe(TEST_TELEGRAM_USER.id);
  });

  it('should skip auth in development mode when SKIP_AUTH is set', () => {
    process.env.NODE_ENV = 'development';
    process.env.SKIP_AUTH = 'true';

    const req = mockRequest({ headers: {} });
    const res = mockResponse();
    const next = mockNext();

    authenticateTelegram(req, res, next);

    expect(next.called).toBe(true);
  });
});
