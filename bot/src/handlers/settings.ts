/**
 * /settings Command Handler
 * Allows users to configure notifications, reminder time, and timezone.
 * Uses Grammy InlineKeyboard and callback queries for sub-menus.
 */

import { InlineKeyboard } from 'grammy';
import type { MyContext } from '../bot.js';
import { queryOne, execute } from '../utils/db.js';

// Callback data prefixes
const CB = {
  NOTIFICATIONS: 'settings:notif',
  NOTIF_ON: 'settings:notif:on',
  NOTIF_OFF: 'settings:notif:off',
  REMINDER: 'settings:reminder',
  REMINDER_SET: 'settings:reminder:', // + hour
  TIMEZONE: 'settings:tz',
  TZ_SET: 'settings:tz:', // + timezone
  BACK: 'settings:back',
} as const;

const REMINDER_HOURS = [
  { label: '🌅 9:00 AM', hour: 9 },
  { label: '☀️ 12:00 PM', hour: 12 },
  { label: '🌇 6:00 PM', hour: 18 },
  { label: '🌙 9:00 PM', hour: 21 },
];

const TIMEZONES = [
  { label: '🇬🇧 UTC+0 (London)', tz: 'UTC' },
  { label: '🇷🇺 UTC+3 (Moscow)', tz: 'Europe/Moscow' },
  { label: '🇪🇺 UTC+1 (Berlin)', tz: 'Europe/Berlin' },
  { label: '🇺🇸 UTC-5 (New York)', tz: 'America/New_York' },
];

async function getUserData(ctx: MyContext) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return null;
  return queryOne('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
}

/**
 * Show main settings menu.
 */
export async function handleSettings(ctx: MyContext) {
  const user = await getUserData(ctx);
  if (!user) {
    await ctx.reply('❌ Could not load your profile. Please /start first.');
    return;
  }

  const notifStatus = user.notification_enabled !== false ? '✅ On' : '❌ Off';
  const tz = user.timezone || 'UTC';

  const keyboard = new InlineKeyboard()
    .text(`🔔 Notifications: ${notifStatus}`, CB.NOTIFICATIONS)
    .row()
    .text('⏰ Reminder Time', CB.REMINDER)
    .row()
    .text(`🌍 Timezone: ${tz}`, CB.TIMEZONE);

  await ctx.reply(
    `⚙️ *Settings*\n\nConfigure your preferences below:`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

/**
 * Handle all settings-related callback queries.
 */
export async function handleSettingsCallback(ctx: MyContext) {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('settings:')) return;

  const user = await getUserData(ctx);
  if (!user) {
    await ctx.answerCallbackQuery({ text: '❌ Profile not found', show_alert: true });
    return;
  }

  // Notifications toggle menu
  if (data === CB.NOTIFICATIONS) {
    const keyboard = new InlineKeyboard()
      .text('✅ Turn On', CB.NOTIF_ON)
      .text('❌ Turn Off', CB.NOTIF_OFF)
      .row()
      .text('« Back', CB.BACK);

    await ctx.editMessageText(
      `🔔 *Notifications*\n\nReceive daily reminders about incomplete quests.\n\nCurrently: ${user.notification_enabled !== false ? '✅ On' : '❌ Off'}`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
    await ctx.answerCallbackQuery();
    return;
  }

  // Toggle notification on/off
  if (data === CB.NOTIF_ON || data === CB.NOTIF_OFF) {
    const enabled = data === CB.NOTIF_ON;
    await execute('UPDATE users SET notification_enabled = $1 WHERE id = $2', [enabled, user.id]);

    await ctx.answerCallbackQuery({ text: enabled ? '🔔 Notifications enabled!' : '🔕 Notifications disabled!' });
    await showMainSettings(ctx, { ...user, notification_enabled: enabled });
    return;
  }

  // Reminder time menu
  if (data === CB.REMINDER) {
    const keyboard = new InlineKeyboard();
    for (const opt of REMINDER_HOURS) {
      keyboard.text(opt.label, `${CB.REMINDER_SET}${opt.hour}`).row();
    }
    keyboard.text('« Back', CB.BACK);

    await ctx.editMessageText(
      `⏰ *Reminder Time*\n\nChoose when to receive your daily quest reminder:`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
    await ctx.answerCallbackQuery();
    return;
  }

  // Set reminder time
  if (data.startsWith(CB.REMINDER_SET)) {
    const hour = data.replace(CB.REMINDER_SET, '');
    await execute('UPDATE users SET reminder_hour = $1 WHERE id = $2', [parseInt(hour), user.id]);

    const label = REMINDER_HOURS.find(h => h.hour.toString() === hour)?.label || hour;
    await ctx.answerCallbackQuery({ text: `⏰ Reminder set to ${label}` });
    await showMainSettings(ctx, user);
    return;
  }

  // Timezone menu
  if (data === CB.TIMEZONE) {
    const keyboard = new InlineKeyboard();
    for (const opt of TIMEZONES) {
      keyboard.text(opt.label, `${CB.TZ_SET}${opt.tz}`).row();
    }
    keyboard.text('« Back', CB.BACK);

    await ctx.editMessageText(
      `🌍 *Timezone*\n\nChoose your timezone for accurate quest scheduling:\n\nCurrent: ${user.timezone || 'UTC'}`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
    await ctx.answerCallbackQuery();
    return;
  }

  // Set timezone
  if (data.startsWith(CB.TZ_SET)) {
    const tz = data.replace(CB.TZ_SET, '');
    await execute('UPDATE users SET timezone = $1 WHERE id = $2', [tz, user.id]);

    const label = TIMEZONES.find(t => t.tz === tz)?.label || tz;
    await ctx.answerCallbackQuery({ text: `🌍 Timezone set to ${label}` });
    await showMainSettings(ctx, { ...user, timezone: tz });
    return;
  }

  // Back to main settings
  if (data === CB.BACK) {
    await showMainSettings(ctx, user);
    await ctx.answerCallbackQuery();
    return;
  }
}

async function showMainSettings(ctx: MyContext, user: any) {
  const notifStatus = user.notification_enabled !== false ? '✅ On' : '❌ Off';
  const tz = user.timezone || 'UTC';

  const keyboard = new InlineKeyboard()
    .text(`🔔 Notifications: ${notifStatus}`, CB.NOTIFICATIONS)
    .row()
    .text('⏰ Reminder Time', CB.REMINDER)
    .row()
    .text(`🌍 Timezone: ${tz}`, CB.TIMEZONE);

  try {
    await ctx.editMessageText(
      `⚙️ *Settings*\n\nConfigure your preferences below:`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  } catch {
    // Message unchanged, ignore
  }
}