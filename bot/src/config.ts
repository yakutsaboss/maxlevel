/**
 * Centralized Configuration
 * Reads environment variables and provides typed config.
 */

export const config = {
  isProduction: process.env.NODE_ENV === 'production',
  useWebhook: process.env.USE_WEBHOOK === 'true',
  webhookDomain: process.env.WEBHOOK_DOMAIN || '',
  webhookPath: '/webhook',
  get webhookUrl(): string {
    return `${this.webhookDomain}${this.webhookPath}`;
  },
  apiPort: parseInt(process.env.API_PORT || '3000', 10),
};
