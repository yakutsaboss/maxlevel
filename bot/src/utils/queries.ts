/**
 * Shared SQL query helpers
 * Reusable database queries used across handlers and routes.
 */

import { query, queryOne } from './db.js';

/** Row shape for the `users` table (SELECT *). */
export type UserRow = {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  created_at: string;
  timezone: string;
  current_level: number;
  total_xp: number;
  is_active: boolean;
  avatar_id: number;
  notification_enabled: boolean;
  reminder_time: number;
};

/** Row shape for the `modes` table (SELECT *). */
export type ModeRow = {
  id: number;
  name: string;
  display_name: string | null;
  description: string | null;
  icon_emoji: string | null;
};

/** Row shape for the user active modes join query. */
export type UserActiveModeRow = {
  mode_id: number;
  name: string;
  display_name: string | null;
  description: string | null;
  icon_emoji: string | null;
  user_mode_id: number;
  enabled_at: string;
  is_active: boolean;
};

export async function getUserByTelegramId(telegramId: number) {
  return queryOne<UserRow>(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
}

export async function listAllModes<T = ModeRow>(): Promise<T[]> {
  return query('SELECT * FROM modes ORDER BY id') as Promise<T[]>;
}

export async function getUserActiveModes<T = UserActiveModeRow>(userId: number): Promise<T[]> {
  return query(
    `SELECT m.id AS mode_id, m.name, m.display_name, m.description, m.icon_emoji,
            um.id AS user_mode_id, um.enabled_at, um.is_active
     FROM user_modes um
     JOIN modes m ON um.mode_id = m.id
     WHERE um.user_id = $1 AND um.is_active = true
     ORDER BY um.enabled_at`,
    [userId]
  ) as Promise<T[]>;
}
