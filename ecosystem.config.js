/**
 * PM2 Ecosystem Configuration
 * For production deployment without Docker
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 start ecosystem.config.js --env staging
 *   pm2 start ecosystem.config.js --env development
 */

module.exports = {
  apps: [
    {
      // Main bot application
      name: 'telegram-rpg-bot',
      script: './bot/dist/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',

      // Environment-specific settings
      env_production: {
        NODE_ENV: 'production',
        API_PORT: 3000,
        LOG_LEVEL: 'info',
        USE_WEBHOOK: 'true',
        WEBHOOK_DOMAIN: 'https://yakutsa.ru',
        MINI_APP_URL: 'https://yakutsa.ru',
      },
      env_staging: {
        NODE_ENV: 'staging',
        API_PORT: 3001,
        LOG_LEVEL: 'debug',
      },
      env_development: {
        NODE_ENV: 'development',
        API_PORT: 3000,
        LOG_LEVEL: 'debug',
        SKIP_AUTH: 'false',  // Still use real auth in dev
      },

      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',

      // Logging
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Watch and restart (disable in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.tmp', '.git'],

      // Advanced options
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,

      // Environment variables from .env
      env_file: '.env',

      // Post-deploy hooks
      post_update: [
        'npm install --production',
        'npm run build',
      ],
    },

    // Optional: Separate API server (if you want to scale independently)
    {
      name: 'telegram-rpg-api',
      script: './bot/dist/api/server.js',
      cwd: './',
      instances: 2,  // Scale API across 2 instances
      exec_mode: 'cluster',

      env_production: {
        NODE_ENV: 'production',
        API_PORT: 3000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        API_PORT: 3001,
      },

      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '300M',

      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      watch: false,
      kill_timeout: 3000,
      env_file: '.env',

      // Only start this if you want separate API process
      // Otherwise, comment out this entire app config
      autorestart: false,  // Disabled by default
    },

    // Optional: Background job processor (for scheduled tasks)
    {
      name: 'telegram-rpg-scheduler',
      script: './bot/dist/scheduler.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',

      env_production: {
        NODE_ENV: 'production',
      },

      autorestart: true,
      max_restarts: 5,
      cron_restart: '0 0 * * *',  // Restart daily at midnight

      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
      merge_logs: true,

      watch: false,
      env_file: '.env',

      // Disabled by default
      autorestart: false,
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'root',
      host: ['85.239.53.57'],
      ref: 'origin/main',
      repo: 'git@github.com:yakutsaboss/maxlevel.git',
      path: '/opt/wibecode-bot',
      'post-deploy': [
        'cd bot && npm ci --omit=dev',
        'npm run build',
        'pm2 reload ecosystem.config.js --only telegram-rpg-bot --env production',
      ].join(' && '),
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
