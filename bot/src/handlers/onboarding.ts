/**
 * Onboarding Handler - Guide new users through mode selection and setup
 * Telegram RPG Quest Bot
 */

import { Context, InlineKeyboard } from 'grammy';
import { executePythonTool } from '../utils/pythonTools.js';

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
  const modesResult = await executePythonTool('mode_manager', ['--list-modes']);

  if (!modesResult.success) {
    await ctx.reply('❌ Error loading modes. Please try again later.');
    return;
  }

  const modes = modesResult.data || [];

  // Create message
  const message =
    `📋 *Choose Your Modes*\n\n` +
    `Modes are categories of quests you want to focus on. ` +
    `You can select multiple modes and change them later.\n\n` +
    `*Available Modes:*\n\n`;

  // Build inline keyboard
  const keyboard = new InlineKeyboard();

  modes.forEach((mode: any, index: number) => {
    const emoji = mode.icon || '📌';
    const name = mode.display_name || mode.name;
    const description = mode.description || '';

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
  const modeId = callbackData.replace('mode_select_', '');

  // Get current user's modes
  const userResult = await executePythonTool('user_manager', [
    '--get-user',
    '--telegram-id',
    userId.toString(),
  ]);

  if (!userResult.success) {
    await ctx.answerCallbackQuery({ text: '❌ Error. Please try again.' });
    return;
  }

  const internalUserId = userResult.data.id;

  // Get currently selected modes
  const modesResult = await executePythonTool('mode_manager', [
    '--get-active-modes',
    '--user-id',
    internalUserId.toString(),
  ]);

  const currentModes = modesResult.success ? modesResult.data : [];
  const isSelected = currentModes.some((m: any) => m.id.toString() === modeId);

  if (isSelected) {
    // Remove mode
    await executePythonTool('mode_manager', [
      '--remove-mode',
      '--user-id',
      internalUserId.toString(),
      '--mode-id',
      modeId,
    ]);

    await ctx.answerCallbackQuery({ text: '➖ Mode removed!' });
  } else {
    // Add mode
    await executePythonTool('mode_manager', [
      '--add-modes',
      '--user-id',
      internalUserId.toString(),
      '--modes',
      modeId,
    ]);

    await ctx.answerCallbackQuery({ text: '✅ Mode added!' });
  }

  // Refresh the mode selection screen
  await updateModeSelectionMessage(ctx, internalUserId);
}

/**
 * Update mode selection message with current selections
 */
async function updateModeSelectionMessage(ctx: Context, userId: number) {
  // Get available modes
  const modesResult = await executePythonTool('mode_manager', ['--list-modes']);
  const allModes = modesResult.success ? modesResult.data : [];

  // Get user's selected modes
  const selectedResult = await executePythonTool('mode_manager', [
    '--get-active-modes',
    '--user-id',
    userId.toString(),
  ]);
  const selectedModes = selectedResult.success ? selectedResult.data : [];
  const selectedIds = selectedModes.map((m: any) => m.id);

  // Build message
  let message =
    `📋 *Choose Your Modes*\n\n` +
    `Select the areas you want to focus on:\n\n`;

  if (selectedModes.length > 0) {
    message += `*Selected (${selectedModes.length}):*\n`;
    selectedModes.forEach((mode: any) => {
      message += `${mode.icon} ${mode.display_name}\n`;
    });
    message += `\n`;
  }

  message += `Tap a mode to add/remove it.`;

  // Build keyboard
  const keyboard = new InlineKeyboard();

  allModes.forEach((mode: any, index: number) => {
    const emoji = mode.icon || '📌';
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
  const modesResult = await executePythonTool('mode_manager', ['--list-modes']);
  const modes = modesResult.success ? modesResult.data : [];

  let message = `ℹ️ *Mode Information*\n\n`;

  modes.forEach((mode: any) => {
    const emoji = mode.icon || '📌';
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
  const userResult = await executePythonTool('user_manager', [
    '--get-user',
    '--telegram-id',
    userId.toString(),
  ]);

  if (!userResult.success) {
    await ctx.reply('❌ Error completing setup. Please try again.');
    return;
  }

  const internalUserId = userResult.data.id;

  // Check if user selected at least one mode
  const modesResult = await executePythonTool('mode_manager', [
    '--get-active-modes',
    '--user-id',
    internalUserId.toString(),
  ]);

  const selectedModes = modesResult.success ? modesResult.data : [];

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
      selectedModes.map((m: any) => `${m.icon} ${m.display_name}`).join('\n'),
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

  // Assign daily quests
  const questResult = await executePythonTool('quest_manager', [
    '--assign-daily',
    '--user-id',
    userId.toString(),
    '--count',
    '3',
  ]);

  if (questResult.success) {
    const questCount = (questResult.data as any)?.count || 0;

    await ctx.reply(
      `✨ *You're All Set!*\n\n` +
        `I've assigned ${questCount} daily quests to get you started.\n\n` +
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

  const userResult = await executePythonTool('user_manager', [
    '--get-user',
    '--telegram-id',
    userId.toString(),
  ]);

  if (!userResult.success) {
    await ctx.reply('❌ Error loading quests.');
    return;
  }

  const internalUserId = userResult.data.id;

  const questsResult = await executePythonTool('quest_manager', [
    '--get-active',
    '--user-id',
    internalUserId.toString(),
  ]);

  if (!questsResult.success || !questsResult.data) {
    await ctx.reply('You have no active quests yet. Use /app to get started!');
    return;
  }

  const quests = questsResult.data;
  let message = `📋 *Your Active Quests*\n\n`;

  quests.slice(0, 5).forEach((quest: any, index: number) => {
    const progress = quest.progress || 0;
    const target = quest.target || 1;
    const percentage = Math.round((progress / target) * 100);
    const progressBar = generateProgressBar(percentage);

    message +=
      `${index + 1}. ${quest.mode_icon} *${quest.name}*\n` +
      `   ${progressBar} ${percentage}%\n` +
      `   ⚡ ${quest.xp_reward} XP\n\n`;
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

  const userResult = await executePythonTool('user_manager', [
    '--get-user',
    '--telegram-id',
    userId.toString(),
  ]);

  if (!userResult.success) {
    await ctx.reply('❌ Error loading profile.');
    return;
  }

  const user = userResult.data;

  const statsResult = await executePythonTool('user_manager', [
    '--get-stats',
    '--user-id',
    user.id.toString(),
  ]);

  const stats = statsResult.success ? statsResult.data : {};

  const level = stats.level || 1;
  const xp = stats.total_xp || 0;
  const streak = stats.current_streak || 0;
  const quests = stats.quests_completed || 0;

  const message =
    `👤 *${firstName}'s Profile*\n\n` +
    `⭐ Level: ${level}\n` +
    `💎 Total XP: ${xp}\n` +
    `🔥 Streak: ${streak} days\n` +
    `✅ Quests Completed: ${quests}\n\n` +
    `Use /app to see your full profile with achievements!`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

/**
 * Generate progress bar visualization
 */
function generateProgressBar(percentage: number, length: number = 10): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;

  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Handle mode management command
 */
export async function handleModesCommand(ctx: Context) {
  const userId = ctx.from?.id;

  if (!userId) return;

  const userResult = await executePythonTool('user_manager', [
    '--get-user',
    '--telegram-id',
    userId.toString(),
  ]);

  if (!userResult.success) {
    await ctx.reply('❌ Error loading your modes.');
    return;
  }

  const internalUserId = userResult.data.id;

  const modesResult = await executePythonTool('mode_manager', [
    '--get-active-modes',
    '--user-id',
    internalUserId.toString(),
  ]);

  const activeModes = modesResult.success ? modesResult.data : [];

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
    activeModes.map((m: any) => `${m.icon} ${m.display_name}`).join('\n') +
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

  const userResult = await executePythonTool('user_manager', [
    '--get-user',
    '--telegram-id',
    userId.toString(),
  ]);

  if (!userResult.success) {
    await ctx.reply('❌ Error loading summary.');
    return;
  }

  const internalUserId = userResult.data.id;

  const summaryResult = await executePythonTool('mode_manager', [
    '--get-mode-summary',
    '--user-id',
    internalUserId.toString(),
  ]);

  if (!summaryResult.success) {
    await ctx.reply('❌ Error loading mode summary.');
    return;
  }

  const summary = summaryResult.data || [];

  let message = `📊 *Mode Summary*\n\n`;

  summary.forEach((mode: any) => {
    message +=
      `${mode.icon} *${mode.mode_name}*\n` +
      `   Active: ${mode.active_quests || 0} quests\n` +
      `   Completed: ${mode.completed_quests || 0} quests\n` +
      `   Total XP: ${mode.total_xp || 0}\n\n`;
  });

  await ctx.reply(message, { parse_mode: 'Markdown' });
}
