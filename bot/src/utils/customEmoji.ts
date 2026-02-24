/**
 * Custom Emoji Support for Bot Messages
 *
 * Uses TG custom emoji (HTML: <tg-emoji emoji-id="ID">fallback</tg-emoji>)
 * to render animated emoji in notification messages when the bot has TG Premium.
 * Falls back to regular Unicode emoji when Premium is not available.
 */

import type { Bot, Context } from 'grammy';
import { logger } from './logger.js';

const log = logger.child({ component: 'customEmoji' });

let botHasPremium = false;

/**
 * Check if the bot account has Telegram Premium.
 * Call once on startup — caches the result for the lifetime of the process.
 */
export async function checkBotPremium<C extends Context>(bot: Bot<C>): Promise<void> {
  try {
    const me = await bot.api.getMe();
    botHasPremium = (me as any).is_premium ?? false;
    log.info(`Bot Premium status: ${botHasPremium}`);
  } catch (err) {
    botHasPremium = false;
    log.warn('Failed to check bot Premium status, defaulting to false', { error: err });
  }
}

// Custom emoji IDs — Telegram animated emoji set
// NOTE: These are placeholder IDs. Replace with actual custom emoji IDs
// from your Telegram sticker set. You can find valid IDs by:
//   1) Sending a custom emoji in a message
//   2) Using bot.api.getCustomEmojiStickers([id]) to verify
const EMOJI_IDS: Record<string, string> = {
  fire: '5368324170671202286',
  star: '5368324170671202286',
  trophy: '5368324170671202286',
  rocket: '5368324170671202286',
  check: '5368324170671202286',
  warning: '5368324170671202286',
};

/**
 * Returns a custom emoji HTML tag if bot has Premium, otherwise the Unicode fallback.
 *
 * @param key - Emoji key from EMOJI_IDS map
 * @param fallback - Unicode emoji fallback (e.g. '🔥')
 */
export function customEmoji(key: string, fallback: string): string {
  if (!botHasPremium || !EMOJI_IDS[key]) return fallback;
  return `<tg-emoji emoji-id="${EMOJI_IDS[key]}">${fallback}</tg-emoji>`;
}

/**
 * Check if custom emoji is currently available (bot has Premium).
 */
export function isCustomEmojiAvailable(): boolean {
  return botHasPremium;
}
