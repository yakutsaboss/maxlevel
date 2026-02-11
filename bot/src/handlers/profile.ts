/**
 * /profile Command Handler
 * Shows formatted user profile with level, XP, modes, streaks, achievements.
 */

import type { Context } from 'grammy';
import { query, queryOne } from '../utils/db.js';
import { logger } from '../utils/logger.js';

const log = logger.child({ component: 'profile' });

export async function handleProfile(ctx: Context) {
  try {
    const telegramId = ctx.from?.id;
    const firstName = ctx.from?.first_name || 'User';

    if (!telegramId) {
      await ctx.reply('Could not identify your Telegram account.');
      return;
    }

    // Fetch user basic info
    const user = await queryOne(
      `SELECT id, telegram_id, username, first_name, current_level, total_xp, timezone, created_at
       FROM users WHERE telegram_id = $1`,
      [telegramId]
    );

    if (!user) {
      await ctx.reply('❌ Profile not found. Use /start to create your account.');
      return;
    }

    // Fetch modes, streaks, achievements count in parallel
    const [modes, streaks, achievementCount] = await Promise.all([
      query(
        `SELECT m.display_name, m.icon_emoji
         FROM user_modes um
         JOIN modes m ON um.mode_id = m.id
         WHERE um.user_id = $1 AND um.is_active = true`,
        [user.id]
      ),
      query(
        `SELECT s.current_streak, s.longest_streak, m.display_name, m.icon_emoji
         FROM streaks s
         JOIN modes m ON s.mode_id = m.id
         WHERE s.user_id = $1`,
        [user.id]
      ),
      queryOne(
        `SELECT COUNT(*)::int AS count FROM user_achievements WHERE user_id = $1`,
        [user.id]
      ),
    ]);

    // XP progress for current level
    const xpForNextLevel = user.current_level * 100;
    const xpInCurrentLevel = user.total_xp % 100;
    const progressBar = buildProgressBar(xpInCurrentLevel, xpForNextLevel > 0 ? 100 : 1);

    // Build message
    const name = user.first_name || user.username || firstName;
    let msg = `👤 *${name}'s Profile*\n\n`;

    msg += `⭐ *Level ${user.current_level}*\n`;
    msg += `${progressBar} ${xpInCurrentLevel}/100 XP\n`;
    msg += `💎 Total XP: ${user.total_xp}\n\n`;

    // Active modes
    if (modes.length > 0) {
      msg += `🎮 *Active Modes:*\n`;
      for (const m of modes) {
        msg += `${m.icon_emoji || '📌'} ${m.display_name}\n`;
      }
      msg += '\n';
    } else {
      msg += `🎮 No active modes. Use /modes to select.\n\n`;
    }

    // Streaks
    if (streaks.length > 0) {
      msg += `🔥 *Streaks:*\n`;
      for (const s of streaks) {
        const icon = s.icon_emoji || '📌';
        const current = s.current_streak ?? 0;
        const best = s.longest_streak ?? 0;
        msg += `${icon} ${s.display_name}: ${current} day${current !== 1 ? 's' : ''} (best: ${best})\n`;
      }
      msg += '\n';
    }

    // Achievements
    const achCount = achievementCount?.count ?? 0;
    msg += `🏆 *Achievements:* ${achCount} unlocked\n\n`;

    // Joined date
    if (user.created_at) {
      const joined = new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      }).format(new Date(user.created_at));
      msg += `📅 Joined: ${joined}`;
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (error) {
    log.error('Error in /profile', error as Error);
    await ctx.reply('Failed to load profile. Try again later.');
  }
}

function buildProgressBar(current: number, max: number): string {
  const filled = Math.round((current / max) * 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}
