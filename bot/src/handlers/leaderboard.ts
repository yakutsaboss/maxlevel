/**
 * /leaderboard command handler
 * Shows top 10 users from the leaderboard materialized view.
 */

import { Context } from 'grammy';
import { query, queryOne } from '../utils/db.js';

export async function handleLeaderboard(ctx: Context) {
  try {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Could not identify your Telegram account.');
      return;
    }

    // Fetch top 10 from materialized view
    const top10 = await query(
      `SELECT username, first_name, current_level, total_xp, xp_rank
       FROM leaderboard_mv
       ORDER BY xp_rank ASC
       LIMIT 10`
    );

    if (top10.length === 0) {
      await ctx.reply('The leaderboard is empty. Be the first to earn XP!');
      return;
    }

    // Build message
    const medals = ['🥇', '🥈', '🥉'];
    let msg = '🏆 *Leaderboard — Top 10*\n\n';

    for (const row of top10) {
      const rank = parseInt(row.xp_rank) || 0;
      const icon = rank <= 3 ? medals[rank - 1] : `${rank}.`;
      const name = row.first_name || row.username || 'Anonymous';
      msg += `${icon} *${name}* — Lv.${row.current_level} · ${row.total_xp} XP\n`;
    }

    // Check if current user is in top 10
    const userInTop = top10.find((r: any) => {
      // We need telegram_id — fetch it separately since leaderboard_mv has it
      return false; // Will check below
    });

    // Fetch current user's rank
    const myRank = await queryOne(
      `SELECT username, first_name, current_level, total_xp, xp_rank
       FROM leaderboard_mv
       WHERE telegram_id = $1`,
      [telegramId]
    );

    if (myRank) {
      const rank = parseInt(myRank.xp_rank) || 0;
      if (rank > 10) {
        const name = myRank.first_name || myRank.username || 'You';
        msg += `\n---\n${rank}. *${name}* — Lv.${myRank.current_level} · ${myRank.total_xp} XP`;
      }
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /leaderboard:', error);
    await ctx.reply('Failed to load leaderboard. Try again later.');
  }
}
