/**
 * Mode Selection - Mode listing, selection, toggling, and management
 */

import { Context, InlineKeyboard } from 'grammy';
import { query, queryOne, execute } from '../../utils/db.js';
import { getUserByTelegramId, listAllModes, getUserActiveModes } from '../../utils/queries.js';
import { completeModeSelection } from './completion.js';

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
