/**
 * Shared SQL query helpers
 * Reusable database queries used across handlers and routes.
 */

import { query, queryOne } from './db.js';

export async function getUserByTelegramId(telegramId: number) {
  return queryOne<Record<string, any>>(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
}

export async function listAllModes() {
  return query('SELECT * FROM modes ORDER BY id');
}

export async function getUserActiveModes(userId: number) {
  return query(
    `SELECT m.id AS mode_id, m.name, m.display_name, m.description, m.icon_emoji,
            um.id AS user_mode_id, um.enabled_at, um.is_active
     FROM user_modes um
     JOIN modes m ON um.mode_id = m.id
     WHERE um.user_id = $1 AND um.is_active = true
     ORDER BY um.enabled_at`,
    [userId]
  );
}
