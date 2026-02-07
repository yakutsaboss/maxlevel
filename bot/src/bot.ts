/**
 * Telegram Bot Instance
 * Creates and configures the Grammy bot
 */

import { Bot, Context, session } from 'grammy';
import type { ParseMode } from 'grammy/types';

// Session data structure
export interface SessionData {
  // Onboarding state
  onboardingStep?: string;
  selectedModes?: string[];
  quizData?: Record<string, any>;

  // User data (cached)
  userId?: number;
  telegramId?: number;
  username?: string;
  firstName?: string;
}

// Extended context with session
export type MyContext = Context & {
  session: SessionData;
};

// Initialize bot
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
}

export const bot = new Bot<MyContext>(botToken);

// Configure session middleware
bot.use(
  session({
    initial: (): SessionData => ({}),
  })
);

// Error handler
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error('Error:', err.error);

  // Send error message to user
  ctx.reply(
    '❌ Oops! Something went wrong. Please try again or contact support.',
    { parse_mode: 'Markdown' as ParseMode }
  ).catch(console.error);
});

// Helper function to format user name
export function getUserName(ctx: MyContext): string {
  return ctx.from?.first_name || ctx.from?.username || 'there';
}

// Helper function to get telegram ID
export function getTelegramId(ctx: MyContext): number | undefined {
  return ctx.from?.id;
}

// Helper function to format message with markdown
export async function sendMarkdownMessage(
  ctx: MyContext,
  text: string,
  extra: Record<string, any> = {}
) {
  return ctx.reply(text, {
    parse_mode: 'Markdown' as ParseMode,
    ...extra,
  });
}

export default bot;
