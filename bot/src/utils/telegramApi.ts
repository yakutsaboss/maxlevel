/**
 * Telegram Bot API Utilities
 * Direct HTTP calls to the Telegram Bot API for operations
 * that don't go through the grammY framework (e.g., channel membership checks).
 */

import { logger } from './logger.js';

const log = logger.child({ component: 'telegramApi' });

const BOT_API_BASE = 'https://api.telegram.org/bot';

/** Telegram getChatMember response status values */
type ChatMemberStatus = 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';

interface ChatMemberResult {
  ok: boolean;
  result?: {
    status: ChatMemberStatus;
    user: { id: number; first_name: string };
  };
  description?: string;
}

export interface ChannelMembershipResult {
  isMember: boolean;
  status: ChatMemberStatus | 'error';
}

/**
 * Check if a Telegram user is a member of a channel.
 * Uses the getChatMember Bot API method.
 *
 * @param telegramId - The user's Telegram ID
 * @param channelUsername - Channel username without @ (default: 'yakutsaway')
 * @returns isMember=true for creator/administrator/member statuses
 */
export async function checkChannelMembership(
  telegramId: number | bigint,
  channelUsername: string = 'yakutsaway',
): Promise<ChannelMembershipResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    log.error('TELEGRAM_BOT_TOKEN not set, cannot check channel membership');
    return { isMember: false, status: 'error' };
  }

  const url = `${BOT_API_BASE}${botToken}/getChatMember`;
  const chatId = `@${channelUsername}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: Number(telegramId),
      }),
    });

    const data = (await response.json()) as ChatMemberResult;

    if (!data.ok || !data.result) {
      log.warn('getChatMember returned not ok', {
        telegramId: Number(telegramId),
        channel: channelUsername,
        description: data.description,
      });
      return { isMember: false, status: 'error' };
    }

    const { status } = data.result;
    const isMember = status === 'creator' || status === 'administrator' || status === 'member';

    log.debug('Channel membership check', {
      telegramId: Number(telegramId),
      channel: channelUsername,
      status,
      isMember,
    });

    return { isMember, status };
  } catch (err) {
    log.error('Failed to check channel membership', err, {
      telegramId: Number(telegramId),
      channel: channelUsername,
    });
    return { isMember: false, status: 'error' };
  }
}
