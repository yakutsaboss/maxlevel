/**
 * Centralized Configuration
 * Reads environment variables and provides typed config.
 * All env vars validated at import time — fail fast on missing required vars.
 */

import { logger } from './api/utils/logger.js';

const log = logger.child({ component: 'config' });

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

// Validate required vars at startup
const TELEGRAM_BOT_TOKEN = requireEnv('TELEGRAM_BOT_TOKEN');
const DATABASE_URL = requireEnv('DATABASE_URL');
const MINI_APP_URL = requireEnv('MINI_APP_URL');

// Optional vars with defaults
const NODE_ENV = optionalEnv('NODE_ENV', 'development');
const API_PORT = parseInt(optionalEnv('API_PORT', '3000'), 10);
const ADMIN_USERNAME = optionalEnv('ADMIN_USERNAME', 'admin');
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const PYTHON_TOOLS_PATH = optionalEnv('PYTHON_TOOLS_PATH', './tools');
const USE_WEBHOOK = process.env.USE_WEBHOOK === 'true';
const WEBHOOK_DOMAIN = optionalEnv('WEBHOOK_DOMAIN', '');

// Log warnings for missing optional vars
if (!process.env.ADMIN_PASSWORD_HASH) {
  log.warn('ADMIN_PASSWORD_HASH not set — admin API uses default credentials');
}
if (!process.env.WEBHOOK_DOMAIN && USE_WEBHOOK) {
  log.warn('USE_WEBHOOK=true but WEBHOOK_DOMAIN not set');
}

export const config = {
  // Core
  botToken: TELEGRAM_BOT_TOKEN,
  databaseUrl: DATABASE_URL,
  miniAppUrl: MINI_APP_URL,

  // Server
  nodeEnv: NODE_ENV,
  isProduction: NODE_ENV === 'production',
  apiPort: API_PORT,

  // Webhook
  useWebhook: USE_WEBHOOK,
  webhookDomain: WEBHOOK_DOMAIN,
  webhookPath: '/webhook',
  get webhookUrl(): string {
    return `${this.webhookDomain}${this.webhookPath}`;
  },

  // Admin
  adminUsername: ADMIN_USERNAME,
  adminPasswordHash: ADMIN_PASSWORD_HASH,

  // Tools
  pythonToolsPath: PYTHON_TOOLS_PATH,
};
