/**
 * Telegram RPG Quest Bot - Main Entry Point
 * Supports webhook (production) and polling (development) modes.
 */

import 'dotenv/config';
import { webhookCallback } from 'grammy';
import bot from './bot.js';
import { config } from './config.js';
import { handleStart } from './handlers/start.js';
import { handleOpenApp, handleOpenQuests, handleOpenProfile } from './handlers/miniapp.js';
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
bot.command('profile', handleOpenProfile);
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

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    '🤖 *Telegram RPG Quest Bot*\n\n' +
      'Turn your real-life goals into epic quests!\n\n' +
      '**Getting Started:**\n' +
      '1. Use /start to create your account\n' +
      '2. Select your modes (Fitness, Hydration)\n' +
      '3. Complete quests to earn XP and level up\n' +
      '4. Unlock achievements and maintain streaks\n\n' +
      '**Commands:**\n' +
      '/start - Start or restart\n' +
      '/menu - View menu\n' +
      '/help - Show this help\n' +
      '/ping - Check bot status\n\n' +
      '_For more info, visit: [Telegram RPG Bot](https://github.com/your-repo)_',
    { parse_mode: 'Markdown' }
  );
});

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
  console.log('='.repeat(50));
  console.log('🤖 Telegram RPG Quest Bot v2.0');
  console.log('='.repeat(50));

  // Test database connection on startup (native Node.js — no Python subprocess)
  console.log('\n📊 Testing database connection...');
  const dbOk = await testDbConnection();

  if (dbOk) {
    console.log('✅ Database connection successful (native pg pool)');
  } else {
    console.error('❌ Database connection failed');
    console.error('\n⚠️  Warning: Bot will start, but database operations will fail!');
    console.error('   Please check your DATABASE_URL in .env\n');
  }

  // Start API server (with or without webhook)
  if (config.useWebhook) {
    // Webhook mode — production
    console.log('\n🌐 Starting API server with webhook...');
    const webhookHandler = webhookCallback(bot, 'express');
    server = await startApiServer(webhookHandler);

    // Register webhook URL with Telegram
    await bot.api.setWebhook(config.webhookUrl);
    console.log(`\n📡 Webhook active: ${config.webhookUrl}`);
  } else {
    // Polling mode — development
    console.log('\n🌐 Starting API server...');
    server = await startApiServer();

    // Clear any stale webhook
    await bot.api.deleteWebhook();

    // Start long polling
    console.log('\n🤖 Starting bot (polling mode)...');
    await bot.start({
      onStart: (botInfo) => {
        console.log('✅ Bot started successfully!');
        console.log(`   Bot username: @${botInfo.username}`);
        console.log(`   Bot ID: ${botInfo.id}`);
        console.log('\n📡 Listening for updates (polling)...\n');
      },
    });
  }

  // Start background job queue
  console.log('\n⏰ Starting background job queue...');
  try {
    const boss = await startJobQueue();
    await registerAllJobs(boss, bot);
    console.log('✅ Background jobs registered\n');
  } catch (err) {
    console.error('⚠️  Job queue failed to start:', err);
    console.error('   Background jobs will not run. Bot continues without them.\n');
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n\n🛑 Received ${signal}, shutting down...`);

  // Stop job queue first
  await stopJobQueue().catch(console.error);

  // Stop bot (polling mode) or close server (webhook mode)
  if (!config.useWebhook) {
    bot.stop();
  }
  if (server) {
    server.close();
  }

  // Close database connection pool
  await closeDbPool().catch(console.error);

  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
