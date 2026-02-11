import { describe, it, expect } from 'vitest';
import { buildDynamicUpdate } from '../../utils/sqlBuilder.js';

describe('buildDynamicUpdate', () => {
  it('builds correct SET clause for a single field', () => {
    const result = buildDynamicUpdate('users', { username: 'alice' }, 'id = $N', [42]);

    expect(result.text).toBe('UPDATE users SET username = $1 WHERE id = $2');
    expect(result.values).toEqual(['alice', 42]);
  });

  it('builds correct SET clause for multiple fields', () => {
    const result = buildDynamicUpdate(
      'users',
      { first_name: 'Bob', timezone: 'UTC', is_active: true },
      'id = $N',
      [7],
    );

    expect(result.text).toBe(
      'UPDATE users SET first_name = $1, timezone = $2, is_active = $3 WHERE id = $4'
    );
    expect(result.values).toEqual(['Bob', 'UTC', true, 7]);
  });

  it('throws on empty fields with no extra clauses', () => {
    expect(() => buildDynamicUpdate('users', {}, 'id = $N', [1])).toThrow(
      'No fields provided for update'
    );
  });

  it('handles WHERE params offset correctly', () => {
    const result = buildDynamicUpdate(
      'users',
      { notification_enabled: false, reminder_time: 9 },
      'telegram_id = $N',
      [123456],
    );

    expect(result.text).toBe(
      'UPDATE users SET notification_enabled = $1, reminder_time = $2 WHERE telegram_id = $3'
    );
    expect(result.values).toEqual([false, 9, 123456]);
  });

  it('appends extraSetClauses after parameterized fields', () => {
    const result = buildDynamicUpdate(
      'punishment_settings',
      { consent_given: true },
      'user_id = $N',
      [5],
      { extraSetClauses: ['consent_timestamp = NOW()', 'updated_at = NOW()'] },
    );

    expect(result.text).toBe(
      'UPDATE punishment_settings SET consent_given = $1, consent_timestamp = NOW(), updated_at = NOW() WHERE user_id = $2'
    );
    expect(result.values).toEqual([true, 5]);
  });

  it('applies type casts to specified columns', () => {
    const result = buildDynamicUpdate(
      'punishment_settings',
      { custom_punishments: '{"foo":1}' },
      'user_id = $N',
      [10],
      { casts: { custom_punishments: 'jsonb' } },
    );

    expect(result.text).toBe(
      'UPDATE punishment_settings SET custom_punishments = $1::jsonb WHERE user_id = $2'
    );
    expect(result.values).toEqual(['{"foo":1}', 10]);
  });
});
