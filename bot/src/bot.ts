/**
 * Telegram Bot Instance
 * Creates and configures the Grammy bot
 */

import { Bot, Context, session } from 'grammy';
import type { ParseMode } from 'grammy/types';
import { logger } from './utils/logger.js';

const log = logger.child({ component: 'bot' });

// Punishment preferences collected during onboarding quiz
export interface QuizPunishments {
  consent_given?: boolean;
  punishment_type?: string | null;
  difficulty?: string;
  intensity_level?: string;
  safe_mode?: boolean;
  custom_punishments?: Record<string, string[]>;
}

// Notification preferences collected during onboarding quiz
export interface QuizNotificationPreferences {
  quest_reminders?: boolean;
  daily_summary?: boolean;
  achievement_alerts?: boolean;
  streak_warnings?: boolean;
}

// Onboarding quiz data stored in session and onboarding_state.quiz_data JSONB column.
// Top-level keys include fixed fields (gender, nickname, etc.) and dynamic per-mode
// quiz response objects keyed by mode name (fitness, hydration, finance, learning).
export interface QuizData {
  gender?: string;
  nickname?: string;
  selected_modes?: string[];
  referral_source?: string;
  referral_source_other?: string;
  pain_points?: Record<string, string[]>;
  punishments?: QuizPunishments;
  notification_preferences?: QuizNotificationPreferences;
  // Per-mode quiz responses (e.g. fitness, hydration, finance, learning)
  [mode: string]: string | string[] | number | boolean | undefined
    | Record<string, unknown> | QuizPunishments | QuizNotificationPreferences
    | Record<string, string[]> | null;
}

// Session data structure
export interface SessionData {
  // Onboarding state
  onboardingStep?: string;
  selectedModes?: string[];
  quizData?: QuizData;

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
  log.error(`Error while handling update ${ctx.update.update_id}`, err.error as Error);

  // Send error message to user
  ctx.reply(
    '❌ Oops! Something went wrong. Please try again or contact support.',
    { parse_mode: 'Markdown' as ParseMode }
  ).catch((replyErr) => log.error('Failed to send error message to user', replyErr as Error));
});

// Helper function to format user name
export function getUserName(ctx: MyContext): string {
  return ctx.from?.first_name || ctx.from?.username || 'there';
}

// Helper function to get telegram ID
export function getTelegramId(ctx: MyContext): number | undefined {
  return ctx.from?.id;
}

// Options type for ctx.reply() — the Grammy "Other" params for sendMessage
type SendMessageOptions = NonNullable<Parameters<MyContext['reply']>[1]>;

// Helper function to format message with markdown
export async function sendMarkdownMessage(
  ctx: MyContext,
  text: string,
  extra: SendMessageOptions = {}
) {
  return ctx.reply(text, {
    parse_mode: 'Markdown' as ParseMode,
    ...extra,
  });
}

export default bot;
