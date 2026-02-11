/**
 * Telegram RPG Quest Bot - Main Entry Point
 * Supports webhook (production) and polling (development) modes.
 */

import 'dotenv/config';
import { webhookCallback } from 'grammy';
import bot from './bot.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';

const log = logger.child({ component: 'main' });
import { handleStart } from './handlers/start.js';
import { handleOpenApp, handleOpenQuests, handleOpenProfile } from './handlers/miniapp.js';
import { handleProfile } from './handlers/profile.js';
import { handleHelp, handleHelpCallback } from './handlers/help.js';
import {
  handleModeSelection,
  handleQuickAction,
  handleModesCommand,
  handleModeSummary,
  showModeSelection
} from './handlers/onboarding.js';
import { handleSettings, handleSettingsCallback } from './handlers/settings.js';
import { handleStats, handleStatsCallback } from './handlers/stats.js';
import { handleLeaderboard } from './handlers/leaderboard.js';
import { startApiServer } from './api/server.js';
import { startJobQueue, stopJobQueue } from './jobs/boss.js';
import { registerAllJobs } from './jobs/registerJobs.js';
import { testConnection as testDbConnection, closePool as closeDbPool } from './utils/db.js';
import type http from 'http';

// Register command handlers
bot.command('start', handleStart);
bot.command('app', handleOpenApp);
bot.command('quests', handleOpenQuests);
bot.command('profile', handleProfile);
bot.command('modes', handleModesCommand);
bot.command('settings', handleSettings);
bot.command('stats', handleStats);
bot.command('leaderboard', handleLeaderboard);

// Register callback query handlers
bot.callbackQuery(/^mode_select_/, handleModeSelection);
bot.callbackQuery('mode_done', handleModeSelection);
bot.callbackQuery('mode_info', handleModeSelection);
bot.callbackQuery('start_mode_selection', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showModeSelection(ctx);
});
bot.callbackQuery('mode_summary', handleModeSummary);
bot.callbackQuery(/^(open_app|view_quests|view_profile)$/, handleQuickAction);
bot.callbackQuery(/^settings:/, handleSettingsCallback);
bot.callbackQuery(/^stats:/, handleStatsCallback);

// Menu command
bot.command('menu', async (ctx) => {
  await ctx.reply(
    '📋 *Menu*\n\n' +
      'Available commands:\n' +
      '/start - Start or restart the bot\n' +
      '/app - Open Mini App (Dashboard)\n' +
      '/quests - View your quests\n' +
      '/profile - View your profile\n' +
      '/modes - Manage your modes\n' +
      '/settings - Configure notifications & timezone\n' +
      '/stats - View your statistics\n' +
      '/leaderboard - View top players\n' +
      '/menu - Show this menu\n' +
      '/help - Get help\n' +
      '/ping - Check if bot is alive\n\n' +
      '_Use the Mini App for the best experience!_',
    { parse_mode: 'Markdown' }
  );
});

// Help command (extracted to handlers/help.ts with inline keyboard categories)
bot.command('help', handleHelp);
bot.callbackQuery(/^help:/, handleHelpCallback);

// Ping command for testing
bot.command('ping', async (ctx) => {
  const startTime = Date.now();
  await ctx.reply('🏓 Pong! Checking systems...');

  // Test database connection (native — no Python subprocess overhead)
  const dbOk = await testDbConnection();
  const responseTime = Date.now() - startTime;

  await ctx.reply(
    `✅ Bot is alive!\n\n` +
      `⚡ Response time: ${responseTime}ms\n` +
      `🗄️ Database: ${dbOk ? '✅ Connected' : '❌ Disconnected'}\n` +
      `📡 Mode: ${config.useWebhook ? 'Webhook' : 'Polling'}\n` +
      `🤖 Bot version: 2.0.0`
  );
});

// Catch-all for unknown commands
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;

  // Ignore commands that are already handled
  if (text.startsWith('/')) {
    await ctx.reply(
      `❓ Unknown command: \`${text}\`\n\n` +
        `Use /menu to see available commands.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Default response for text messages
  await ctx.reply(
    `👋 Hi! I'm your RPG Quest companion.\n\n` +
      `Use /start to begin your journey or /menu to see available commands.`
  );
});

// Track server reference for graceful shutdown
let server: http.Server | null = null;

// Start bot and API server
async function main() {
  log.info('Telegram RPG Quest Bot v2.0 starting');

  // Test database connection on startup (native Node.js — no Python subprocess)
  log.info('Testing database connection...');
  const dbOk = await testDbConnection();

  if (dbOk) {
    log.info('Database connection successful (native pg pool)');
  } else {
    log.error('Database connection failed');
    log.error('Bot will start, but database operations will fail! Check DATABASE_URL in .env');
  }

  // Start API server (with or without webhook)
  if (config.useWebhook) {
    // Webhook mode — production
    log.info('Starting API server with webhook...');
    const webhookHandler = webhookCallback(bot, 'express');
    server = await startApiServer(webhookHandler);

    // Register webhook URL with Telegram
    await bot.api.setWebhook(config.webhookUrl);
    log.info(`Webhook active: ${config.webhookUrl}`);
  } else {
    // Polling mode — development
    log.info('Starting API server...');
    server = await startApiServer();

    // Clear any stale webhook
    await bot.api.deleteWebhook();

    // Start long polling
    log.info('Starting bot (polling mode)...');
    await bot.start({
      onStart: (botInfo) => {
        log.info('Bot started successfully', { username: `@${botInfo.username}`, id: botInfo.id });
        log.info('Listening for updates (polling)...');
      },
    });
  }

  // Set BotFather command list programmatically
  await bot.api.setMyCommands([
    { command: 'start', description: 'Start or restart the bot' },
    { command: 'app', description: 'Open Mini App' },
    { command: 'quests', description: 'View your quests' },
    { command: 'profile', description: 'View your profile' },
    { command: 'modes', description: 'Manage your modes' },
    { command: 'leaderboard', description: 'View top players' },
    { command: 'stats', description: 'View your statistics' },
    { command: 'settings', description: 'Configure notifications' },
    { command: 'help', description: 'Get help' },
    { command: 'menu', description: 'Show all commands' },
  ]);
  log.info('Bot commands registered with BotFather');

  // Start background job queue
  log.info('Starting background job queue...');
  try {
    const boss = await startJobQueue();
    await registerAllJobs(boss, bot);
    log.info('Background jobs registered');
  } catch (err) {
    log.error('Job queue failed to start — background jobs will not run', err as Error);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  log.info(`Received ${signal}, shutting down...`);

  // Stop job queue first
  await stopJobQueue().catch((err) => log.error('Error stopping job queue', err as Error));

  // Stop bot (polling mode) or close server (webhook mode)
  if (!config.useWebhook) {
    bot.stop();
  }
  if (server) {
    server.close();
  }

  // Close database connection pool
  await closeDbPool().catch((err) => log.error('Error closing DB pool', err as Error));

  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Run
main().catch((error) => {
  log.error('Fatal error', error as Error);
  process.exit(1);
});
