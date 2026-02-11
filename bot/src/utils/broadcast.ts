/**
 * Shared broadcast utility for sending Telegram messages in batches.
 * Handles rate limiting with batched Promise.allSettled and delays.
 */

import { logger } from './logger.js';

const log = logger.child({ component: 'broadcast' });
const BATCH_SIZE = 20;

/**
 * Send a message to multiple Telegram chat IDs in batches.
 *
 * @param botToken - Telegram Bot API token
 * @param chatIds - Array of Telegram chat/user IDs to send to
 * @param text - HTML-formatted message text
 * @returns { sent, failed } counts
 */
export async function broadcastMessage(
  botToken: string,
  chatIds: number[],
  text: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < chatIds.length; i += BATCH_SIZE) {
    const batch = chatIds.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (chatId) => {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
          }),
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Telegram API ${response.status}: ${err}`);
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        log.warn('Broadcast failed for user', { error: result.reason?.message });
      }
    }

    // Rate limit delay between batches (skip after last batch)
    if (i + BATCH_SIZE < chatIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { sent, failed };
}
