/**
 * Rate Limiting Middleware
 * Protects API from abuse and DDoS attacks
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

const rlLog = logger.child({ component: 'rateLimiter' });

/**
 * General API rate limiter
 * Applies to all API routes
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window (shorter = fairer for bursty traffic)
  max: 120, // 120 requests per minute per IP (2 req/sec sustained)
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
  // Log when rate limit is hit
  handler: (req, res) => {
    rlLog.warn('Rate limit exceeded', { ip: req.ip, path: req.path, requestId: req.requestId });

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
  handler: (req, res) => {
    rlLog.warn('Auth rate limit exceeded', { ip: req.ip, requestId: req.requestId });

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
  handler: (req, res) => {
    rlLog.warn('Mutation rate limit exceeded', { method: req.method, path: req.path, ip: req.ip, requestId: req.requestId });

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
  handler: (req, res) => {
    rlLog.warn('Read rate limit exceeded', { path: req.path, ip: req.ip, requestId: req.requestId });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many read requests. Please slow down.',
      retryAfter: '1 minute',
    });
  },
});
