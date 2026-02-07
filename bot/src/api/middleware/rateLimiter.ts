/**
 * Rate Limiting Middleware
 * Protects API from abuse and DDoS attacks
 */

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * Applies to all API routes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip rate limiting in development mode
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  },
  // Custom key generator (use IP address)
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  // Log when rate limit is hit
  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress;
    console.warn(`[RATE LIMIT] IP ${ip} exceeded rate limit on ${req.path}`);

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit to 20 auth attempts per 5 minutes
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts, please try again later',
    retryAfter: '5 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  },
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress;
    console.error(`[RATE LIMIT - AUTH] IP ${ip} exceeded auth rate limit`);

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many authentication attempts. Please wait before trying again.',
      retryAfter: '5 minutes',
    });
  },
});

/**
 * Strict rate limiter for mutation operations (POST, PUT, PATCH, DELETE)
 * Prevents spam and abuse
 */
export const mutationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit to 30 mutations per minute
  message: {
    error: 'Too Many Requests',
    message: 'Too many write operations, please slow down',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to mutation methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return true;
    }
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  },
  keyGenerator: (req) => {
    // Use combination of IP and user ID if available
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const telegramUser = (req as any).telegramUser;
    return telegramUser ? `${ip}-${telegramUser.id}` : ip;
  },
  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress;
    const telegramUser = (req as any).telegramUser;
    console.warn(
      `[RATE LIMIT - MUTATION] ${req.method} ${req.path} - IP: ${ip}` +
      (telegramUser ? `, User: ${telegramUser.id}` : '')
    );

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many write operations. Please slow down.',
      retryAfter: '1 minute',
    });
  },
});

/**
 * Lenient rate limiter for read operations
 * More permissive for GET requests
 */
export const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit to 60 reads per minute
  message: {
    error: 'Too Many Requests',
    message: 'Too many read requests, please slow down',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to GET requests
    if (req.method !== 'GET') {
      return true;
    }
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  },
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const telegramUser = (req as any).telegramUser;
    return telegramUser ? `${ip}-${telegramUser.id}` : ip;
  },
  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress;
    console.warn(`[RATE LIMIT - READ] GET ${req.path} - IP: ${ip}`);

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many read requests. Please slow down.',
      retryAfter: '1 minute',
    });
  },
});
