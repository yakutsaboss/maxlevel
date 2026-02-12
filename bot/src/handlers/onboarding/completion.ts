/**
 * Onboarding Completion - Mode selection finalization and initial quest assignment
 */

import { Context, InlineKeyboard } from 'grammy';
import { query, execute } from '../../utils/db.js';
import { getUserByTelegramId, getUserActiveModes } from '../../utils/queries.js';

interface SelectedMode {
  icon_emoji: string;
  display_name: string;
}

type ModeRow = {
  mode_id: number;
};

/**
 * Complete mode selection and start quest assignment
 */
export async function completeModeSelection(ctx: Context) {
  const userId = ctx.from?.id;

  if (!userId) return;

  // Get user's internal ID
  const user = await getUserByTelegramId(userId);

  if (!user) {
    await ctx.reply('❌ Error completing setup. Please try again.');
    return;
  }

  const internalUserId = user.id;

  // Check if user selected at least one mode
  const selectedModes = await getUserActiveModes(internalUserId) as SelectedMode[];

  if (selectedModes.length === 0) {
    await ctx.answerCallbackQuery({
      text: '⚠️ Please select at least one mode!',
      show_alert: true,
    });
    return;
  }

  // Success! Show completion message
  await ctx.editMessageText(
    `✅ *Modes Selected!*\n\n` +
      `You've chosen ${selectedModes.length} mode(s):\n` +
      selectedModes.map(m => `${m.icon_emoji} ${m.display_name}`).join('\n'),
    { parse_mode: 'Markdown' }
  );

  // Small delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Assign initial quests
  await assignInitialQuests(ctx, internalUserId);
}

/**
 * Assign initial quests to new user
 */
async function assignInitialQuests(ctx: Context, userId: number) {
  await ctx.reply(
    `🎯 *Assigning Your First Quests...*\n\n` +
      `Based on your selected modes, I'm creating personalized quests for you!`,
    { parse_mode: 'Markdown' }
  );

  // Get user's active mode IDs
  const modes = await query<ModeRow>(
    'SELECT mode_id FROM user_modes WHERE user_id = $1 AND is_active = true',
    [userId]
  );

  if (modes.length === 0) {
    await ctx.reply(
      `✅ *Setup Complete!*\n\n` +
        `Use /quests to view and manage your quests.\n` +
        `Use /app to open the Mini App for the best experience!`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const modeIds = modes.map(m => m.mode_id);
  const today = new Date().toISOString().split('T')[0];

  // Find available daily templates not assigned today
  const templates = await query<{ id: number; difficulty: string }>(
    `SELECT q.* FROM quests q
     WHERE q.mode_id = ANY($1) AND q.quest_type = 'daily'
     AND q.id NOT IN (
       SELECT quest_id FROM quest_instances WHERE user_id = $2 AND instance_date = $3
     )
     ORDER BY RANDOM() LIMIT $4`,
    [modeIds, userId, today, 3]
  );

  // Assign each template
  let assignedCount = 0;
  for (const t of templates) {
    const target = ({ easy: 1, medium: 3, hard: 5 } as Record<string, number>)[t.difficulty] || 1;
    try {
      await execute(
        `INSERT INTO quest_instances (user_id, quest_id, instance_date, status, target)
         VALUES ($1, $2, $3, 'pending', $4)`,
        [userId, t.id, today, target]
      );
      assignedCount++;
    } catch {
      // Skip duplicates or constraint violations
    }
  }

  if (assignedCount > 0) {
    await ctx.reply(
      `✨ *You're All Set!*\n\n` +
        `I've assigned ${assignedCount} daily quests to get you started.\n\n` +
        `*What's Next:*\n` +
        `• Check your quests: /quests\n` +
        `• View your profile: /profile\n` +
        `• Open the Mini App: /app\n\n` +
        `Complete quests to earn XP, level up, and unlock achievements! 🏆`,
      { parse_mode: 'Markdown' }
    );

    // Show quick action buttons
    const keyboard = new InlineKeyboard()
      .text('🎮 Open Mini App', 'open_app')
      .row()
      .text('📋 View Quests', 'view_quests')
      .text('👤 My Profile', 'view_profile');

    await ctx.reply('Choose an action:', { reply_markup: keyboard });
  } else {
    await ctx.reply(
      `✅ *Setup Complete!*\n\n` +
        `Use /quests to view and manage your quests.\n` +
        `Use /app to open the Mini App for the best experience!`,
      { parse_mode: 'Markdown' }
    );
  }
}
