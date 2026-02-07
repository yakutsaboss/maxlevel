/**
 * Telegram RPG Quest Bot - Main Entry Point
 * Phase 1: Foundation - Basic bot with /start command
 */

import 'dotenv/config';
import bot from './bot.js';
import { handleStart } from './handlers/start.js';
import { handleOpenApp, handleOpenQuests, handleOpenProfile } from './handlers/miniapp.js';
import {
  handleModeSelection,
  handleQuickAction,
  handleModesCommand,
  handleModeSummary,
  showModeSelection
} from './handlers/onboarding.js';
import { testDatabaseConnection } from './utils/pythonTools.js';
import { startApiServer } from './api/server.js';

// Register command handlers
bot.command('start', handleStart);
bot.command('app', handleOpenApp);
bot.command('quests', handleOpenQuests);
bot.command('profile', handleOpenProfile);
bot.command('modes', handleModesCommand);

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

  // Test database connection
  const dbTest = await testDatabaseConnection();
  const responseTime = Date.now() - startTime;

  await ctx.reply(
    `✅ Bot is alive!\n\n` +
      `⚡ Response time: ${responseTime}ms\n` +
      `🗄️ Database: ${dbTest.success ? '✅ Connected' : '❌ Disconnected'}\n` +
      `🤖 Bot version: 1.0.0 (Phase 1)`
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

// Start bot and API server
async function main() {
  console.log('='.repeat(50));
  console.log('🤖 Telegram RPG Quest Bot - Phase 1');
  console.log('='.repeat(50));

  // Test database connection on startup
  console.log('\n📊 Testing database connection...');
  const dbTest = await testDatabaseConnection();

  if (dbTest.success) {
    console.log('✅ Database connection successful');
    if (dbTest.data) {
      console.log(`   ${dbTest.data}`);
    }
  } else {
    console.error('❌ Database connection failed:', dbTest.error);
    console.error('\n⚠️  Warning: Bot will start, but database operations will fail!');
    console.error('   Please check your DATABASE_URL in .env\n');
  }

  // Start API server
  console.log('\n🌐 Starting API server...');
  await startApiServer();

  // Start bot polling
  console.log('\n🤖 Starting bot...');
  await bot.start({
    onStart: (botInfo) => {
      console.log('✅ Bot started successfully!');
      console.log(`   Bot username: @${botInfo.username}`);
      console.log(`   Bot ID: ${botInfo.id}`);
      console.log('\n📡 Listening for updates...\n');
    },
  });
}

// Handle shutdown gracefully
process.once('SIGINT', () => {
  console.log('\n\n🛑 Shutting down bot...');
  bot.stop();
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down bot...');
  bot.stop();
  process.exit(0);
});

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
