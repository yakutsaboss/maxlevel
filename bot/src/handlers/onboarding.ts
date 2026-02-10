/**
 * Onboarding Handler - Guide new users through mode selection and setup
 * Telegram RPG Quest Bot
 */

import { Context, InlineKeyboard } from 'grammy';
import { query, queryOne, execute } from '../utils/db.js';
import { getUserByTelegramId, listAllModes, getUserActiveModes } from '../utils/queries.js';

/**
 * Start onboarding process
 */
export async function handleOnboarding(ctx: Context) {
  const userId = ctx.from?.id;
  const firstName = ctx.from?.first_name || 'there';

  if (!userId) {
    await ctx.reply('Error: Unable to identify user.');
    return;
  }

  // Welcome message
  await ctx.reply(
    `🎮 *Welcome to your RPG Quest journey, ${firstName}!*\n\n` +
      `I'll help you turn your real-life goals into epic quests.\n\n` +
      `Let's start by setting up your account...`,
    { parse_mode: 'Markdown' }
  );

  // Small delay for better UX
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Show mode selection
  await showModeSelection(ctx);
}

/**
 * Show mode selection screen
 */
export async function showModeSelection(ctx: Context) {
  const userId = ctx.from?.id;

  if (!userId) return;

  // Get available modes from database
  const modes = await listAllModes();

  if (modes.length === 0) {
    await ctx.reply('❌ Error loading modes. Please try again later.');
    return;
  }

  // Create message
  const message =
    `📋 *Choose Your Modes*\n\n` +
    `Modes are categories of quests you want to focus on. ` +
    `You can select multiple modes and change them later.\n\n` +
    `*Available Modes:*\n\n`;

  // Build inline keyboard
  const keyboard = new InlineKeyboard();

  modes.forEach((mode: any, index: number) => {
    const emoji = mode.icon_emoji || '📌';
    const name = mode.display_name || mode.name;

    // Add mode button
    keyboard.text(
      `${emoji} ${name}`,
      `mode_select_${mode.id}`
    );

    // Two buttons per row
    if (index % 2 === 1 || index === modes.length - 1) {
      keyboard.row();
    }
  });

  // Add "Done" button
  keyboard.text('✅ Continue', 'mode_done').row();
  keyboard.text('ℹ️ More Info', 'mode_info');

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

/**
 * Handle mode selection callback
 */
export async function handleModeSelection(ctx: Context) {
  const callbackData = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;

  if (!callbackData || !userId) return;

  if (callbackData === 'mode_info') {
    await showModeInfo(ctx);
    await ctx.answerCallbackQuery();
    return;
  }

  if (callbackData === 'mode_done') {
    await completeModeSelection(ctx);
    await ctx.answerCallbackQuery();
    return;
  }

  // Extract mode ID from callback data
  const modeId = parseInt(callbackData.replace('mode_select_', ''));

  // Get current user
  const user = await getUserByTelegramId(userId);

  if (!user) {
    await ctx.answerCallbackQuery({ text: '❌ Error. Please try again.' });
    return;
  }

  const internalUserId = user.id;

  // Get currently selected modes
  const currentModes = await getUserActiveModes(internalUserId);
  const isSelected = currentModes.some((m: any) => m.mode_id === modeId);

  if (isSelected) {
    // Remove mode (soft delete)
    await execute(
      'UPDATE user_modes SET is_active = false WHERE user_id = $1 AND mode_id = $2 AND is_active = true',
      [internalUserId, modeId]
    );

    await ctx.answerCallbackQuery({ text: '➖ Mode removed!' });
  } else {
    // Add mode by ID — check if exists, reactivate or insert
    const existing = await queryOne<Record<string, any>>(
      'SELECT * FROM user_modes WHERE user_id = $1 AND mode_id = $2',
      [internalUserId, modeId]
    );

    if (existing && !existing.is_active) {
      await execute(
        'UPDATE user_modes SET is_active = true, enabled_at = NOW() WHERE id = $1',
        [existing.id]
      );
    } else if (!existing) {
      await execute(
        'INSERT INTO user_modes (user_id, mode_id, is_active) VALUES ($1, $2, true)',
        [internalUserId, modeId]
      );
      // Initialize streak for this mode
      await execute(
        `INSERT INTO streaks (user_id, mode_id, current_streak, longest_streak)
         VALUES ($1, $2, 0, 0)
         ON CONFLICT (user_id, mode_id) DO NOTHING`,
        [internalUserId, modeId]
      );
    }

    await ctx.answerCallbackQuery({ text: '✅ Mode added!' });
  }

  // Refresh the mode selection screen
  await updateModeSelectionMessage(ctx, internalUserId);
}

/**
 * Update mode selection message with current selections
 */
async function updateModeSelectionMessage(ctx: Context, userId: number) {
  // Get available modes and user's selected modes
  const allModes = await listAllModes();
  const selectedModes = await getUserActiveModes(userId);
  const selectedIds = selectedModes.map((m: any) => m.mode_id);

  // Build message
  let message =
    `📋 *Choose Your Modes*\n\n` +
    `Select the areas you want to focus on:\n\n`;

  if (selectedModes.length > 0) {
    message += `*Selected (${selectedModes.length}):*\n`;
    selectedModes.forEach((mode: any) => {
      message += `${mode.icon_emoji} ${mode.display_name}\n`;
    });
    message += `\n`;
  }

  message += `Tap a mode to add/remove it.`;

  // Build keyboard
  const keyboard = new InlineKeyboard();

  allModes.forEach((mode: any, index: number) => {
    const emoji = mode.icon_emoji || '📌';
    const name = mode.display_name || mode.name;
    const isSelected = selectedIds.includes(mode.id);
    const checkmark = isSelected ? '✓ ' : '';

    keyboard.text(
      `${checkmark}${emoji} ${name}`,
      `mode_select_${mode.id}`
    );

    if (index % 2 === 1 || index === allModes.length - 1) {
      keyboard.row();
    }
  });

  keyboard.text('✅ Continue', 'mode_done').row();
  keyboard.text('ℹ️ More Info', 'mode_info');

  // Update message
  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (error) {
    // Message might be the same, ignore error
  }
}

/**
 * Show detailed mode information
 */
async function showModeInfo(ctx: Context) {
  const modes = await listAllModes();

  let message = `ℹ️ *Mode Information*\n\n`;

  modes.forEach((mode: any) => {
    const emoji = mode.icon_emoji || '📌';
    const name = mode.display_name || mode.name;
    const desc = mode.description || 'No description';

    message += `${emoji} *${name}*\n${desc}\n\n`;
  });

  message += `Choose modes that align with your goals. You can change them anytime!`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

/**
 * Complete mode selection and start quest assignment
 */
async function completeModeSelection(ctx: Context) {
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
  const selectedModes = await getUserActiveModes(internalUserId);

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
      selectedModes.map((m: any) => `${m.icon_emoji} ${m.display_name}`).join('\n'),
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
  const modes = await query(
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

  const modeIds = modes.map((m: any) => m.mode_id);
  const today = new Date().toISOString().split('T')[0];

  // Find available daily templates not assigned today
  const templates = await query(
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

/**
 * Handle quick action buttons
 */
export async function handleQuickAction(ctx: Context) {
  const action = ctx.callbackQuery?.data;

  if (!action) return;

  await ctx.answerCallbackQuery();

  switch (action) {
    case 'open_app':
      // Import and call miniapp handler
      const miniAppUrl = process.env.MINI_APP_URL || 'https://your-miniapp-url.com';
      const keyboard = new InlineKeyboard().webApp('🎮 Open RPG Quest', miniAppUrl);

      await ctx.reply('Tap the button below to open the Mini App:', {
        reply_markup: keyboard,
      });
      break;

    case 'view_quests':
      await showQuickQuests(ctx);
      break;

    case 'view_profile':
      await showQuickProfile(ctx);
      break;
  }
}

/**
 * Show quick quests overview
 */
async function showQuickQuests(ctx: Context) {
  const userId = ctx.from?.id;

  if (!userId) return;

  const user = await getUserByTelegramId(userId);

  if (!user) {
    await ctx.reply('❌ Error loading quests.');
    return;
  }

  const quests = await query(
    `SELECT qi.id, qi.quest_id, q.title AS name, q.description, q.xp_reward,
            q.quest_type, q.difficulty, q.mode_id, m.name AS mode_name,
            m.icon_emoji AS mode_icon, qi.status, qi.instance_date,
            qi.check_in_count, qi.target
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     LEFT JOIN modes m ON q.mode_id = m.id
     WHERE qi.user_id = $1 AND qi.status IN ('pending', 'ready', 'in_progress')
     ORDER BY qi.instance_date ASC`,
    [user.id]
  );

  if (quests.length === 0) {
    await ctx.reply('You have no active quests yet. Use /app to get started!');
    return;
  }

  let message = `📋 *Your Active Quests*\n\n`;

  quests.slice(0, 5).forEach((quest: any, index: number) => {
    const icon = quest.mode_icon || '📌';
    const status = quest.status === 'pending' ? '⏳' : quest.status === 'in_progress' ? '🔄' : '✅';

    message +=
      `${index + 1}. ${icon} *${quest.name}*\n` +
      `   ${status} ${quest.status} · ⚡ ${quest.xp_reward} XP\n\n`;
  });

  if (quests.length > 5) {
    message += `_...and ${quests.length - 5} more_\n\n`;
  }

  message += `Use /app to view all quests and track progress!`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

/**
 * Show quick profile overview
 */
async function showQuickProfile(ctx: Context) {
  const userId = ctx.from?.id;
  const firstName = ctx.from?.first_name || 'User';

  if (!userId) return;

  const user = await getUserByTelegramId(userId);

  if (!user) {
    await ctx.reply('❌ Error loading profile.');
    return;
  }

  // Get streaks and quest count in parallel
  const [streaks, totalCompleted] = await Promise.all([
    query(
      `SELECT s.current_streak FROM streaks s WHERE s.user_id = $1`,
      [user.id]
    ),
    queryOne<Record<string, any>>(
      `SELECT COUNT(*)::int AS total FROM quest_instances WHERE user_id = $1 AND status = 'completed'`,
      [user.id]
    ),
  ]);

  const level = user.current_level || 1;
  const xp = user.total_xp || 0;
  const overallStreak = streaks.length > 0
    ? Math.min(...streaks.map((s: any) => s.current_streak))
    : 0;
  const questsCompleted = totalCompleted?.total || 0;

  const message =
    `👤 *${firstName}'s Profile*\n\n` +
    `⭐ Level: ${level}\n` +
    `💎 Total XP: ${xp}\n` +
    `🔥 Streak: ${overallStreak} days\n` +
    `✅ Quests Completed: ${questsCompleted}\n\n` +
    `Use /app to see your full profile with achievements!`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

/**
 * Handle mode management command
 */
export async function handleModesCommand(ctx: Context) {
  const userId = ctx.from?.id;

  if (!userId) return;

  const user = await getUserByTelegramId(userId);

  if (!user) {
    await ctx.reply('❌ Error loading your modes.');
    return;
  }

  const internalUserId = user.id;
  const activeModes = await getUserActiveModes(internalUserId);

  if (activeModes.length === 0) {
    await ctx.reply(
      `You haven't selected any modes yet.\n\n` +
        `Use the button below to choose your modes:`,
      {
        reply_markup: new InlineKeyboard().text('📋 Select Modes', 'start_mode_selection'),
      }
    );
    return;
  }

  let message =
    `📋 *Your Active Modes*\n\n` +
    activeModes.map((m: any) => `${m.icon_emoji} ${m.display_name}`).join('\n') +
    `\n\nWant to change your modes?`;

  const keyboard = new InlineKeyboard()
    .text('➕ Add/Remove Modes', 'start_mode_selection')
    .row()
    .text('📊 Mode Summary', 'mode_summary');

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

/**
 * Show mode summary with quest counts
 */
export async function handleModeSummary(ctx: Context) {
  const userId = ctx.from?.id;

  if (!userId) return;

  await ctx.answerCallbackQuery();

  const user = await getUserByTelegramId(userId);

  if (!user) {
    await ctx.reply('❌ Error loading summary.');
    return;
  }

  const internalUserId = user.id;

  // Get all modes and user's modes to compute summary
  const [allModes, userModes] = await Promise.all([
    listAllModes(),
    query(
      `SELECT m.id AS mode_id, m.name, m.display_name, m.description, m.icon_emoji,
              um.is_active
       FROM user_modes um
       JOIN modes m ON um.mode_id = m.id
       WHERE um.user_id = $1
       ORDER BY um.enabled_at`,
      [internalUserId]
    ),
  ]);

  const activeModes = userModes.filter((um: any) => um.is_active);
  const userModeNames = userModes.map((um: any) => um.name);
  const availableToAdd = allModes.filter((m: any) => !userModeNames.includes(m.name));

  let message = `📊 *Mode Summary*\n\n`;
  message += `Active modes: ${activeModes.length}\n`;
  message += `Available to add: ${availableToAdd.length}\n\n`;

  if (activeModes.length > 0) {
    message += `*Your Modes:*\n`;
    activeModes.forEach((mode: any) => {
      message += `${mode.icon_emoji || '📌'} ${mode.display_name || mode.name}\n`;
    });
  } else {
    message += `_No active modes. Use /modes to select some!_`;
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
}
