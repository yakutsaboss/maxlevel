/**
 * Startup Configuration Validator
 *
 * Validates that all required environment variables are present before
 * the application starts. Unlike the root config.ts which throws on
 * the first missing var, this collects ALL missing vars and reports
 * them together for easier debugging.
 *
 * Usage:
 *   import { validateConfig, appConfig } from './utils/config.js';
 *   const issues = validateConfig();
 *   if (issues.length > 0) process.exit(1);
 */

import { logger } from './logger.js';

const log = logger.child({ component: 'config-validator' });

interface ConfigIssue {
  variable: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface AppConfig {
  botToken: string;
  databaseUrl: string;
  miniAppUrl: string;
  nodeEnv: string;
  isProduction: boolean;
  apiPort: number;
  adminUsername: string;
  adminPasswordHash: string;
  useWebhook: boolean;
  webhookDomain: string;
  pythonExecutable: string;
  pythonToolsPath: string;
  logLevel: string;
}

/**
 * Validate all required and recommended environment variables.
 * Returns an array of issues found. Empty array means all good.
 * Logs each issue as error or warning.
 */
export function validateConfig(): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  // --- Required variables ---
  const required: Array<{ name: string; hint: string }> = [
    { name: 'TELEGRAM_BOT_TOKEN', hint: 'Get from @BotFather on Telegram' },
    { name: 'DATABASE_URL', hint: 'PostgreSQL connection string, e.g. postgresql://user:pass@localhost:5432/db' },
  ];

  for (const { name, hint } of required) {
    if (!process.env[name]) {
      issues.push({
        variable: name,
        severity: 'error',
        message: `Missing required env var ${name} — ${hint}`,
      });
    }
  }

  // --- Conditionally required ---
  if (process.env.USE_WEBHOOK === 'true' && !process.env.WEBHOOK_DOMAIN) {
    issues.push({
      variable: 'WEBHOOK_DOMAIN',
      severity: 'error',
      message: 'USE_WEBHOOK=true but WEBHOOK_DOMAIN is not set',
    });
  }

  // --- Warnings for recommended variables ---
  if (!process.env.ADMIN_PASSWORD_HASH) {
    issues.push({
      variable: 'ADMIN_PASSWORD_HASH',
      severity: 'warning',
      message: 'ADMIN_PASSWORD_HASH not set — admin API will reject all logins',
    });
  }

  if (!process.env.MINI_APP_URL) {
    issues.push({
      variable: 'MINI_APP_URL',
      severity: 'warning',
      message: 'MINI_APP_URL not set — bot will use fallback URL for mini app links',
    });
  }

  // Log all issues
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  for (const w of warnings) {
    log.warn(w.message);
  }

  for (const e of errors) {
    log.error(e.message);
  }

  if (errors.length > 0) {
    log.error(`Config validation failed: ${errors.length} required variable(s) missing`, undefined, {
      missing: errors.map(e => e.variable),
    });
  } else if (warnings.length > 0) {
    log.info(`Config validation passed with ${warnings.length} warning(s)`);
  } else {
    log.info('Config validation passed — all variables set');
  }

  return issues;
}

/**
 * Build a typed config object from current environment.
 * Safe to call after validateConfig() — uses defaults for optional vars.
 */
export function getAppConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    databaseUrl: process.env.DATABASE_URL || '',
    miniAppUrl: process.env.MINI_APP_URL || 'https://your-domain.com/levelapp',
    nodeEnv,
    isProduction: nodeEnv === 'production',
    apiPort: parseInt(process.env.API_PORT || '3000', 10),
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
    useWebhook: process.env.USE_WEBHOOK === 'true',
    webhookDomain: process.env.WEBHOOK_DOMAIN || '',
    pythonExecutable: process.env.PYTHON_EXECUTABLE || 'python',
    pythonToolsPath: process.env.PYTHON_TOOLS_PATH || './tools',
    logLevel: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),
  };
}

/** Pre-built config object for convenience. */
export const appConfig: AppConfig = getAppConfig();
