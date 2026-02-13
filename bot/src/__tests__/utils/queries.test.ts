import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module before importing the module under test
vi.mock('../../utils/db.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

import {
  getUserByTelegramId,
  listAllModes,
  getUserActiveModes,
} from '../../utils/queries.js';
import type { UserRow, ModeRow, UserActiveModeRow } from '../../utils/queries.js';
import { query, queryOne } from '../../utils/db.js';

const mockQuery = vi.mocked(query);
const mockQueryOne = vi.mocked(queryOne);

describe('getUserByTelegramId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user row for a valid telegram ID', async () => {
    const fakeUser: UserRow = {
      id: 1,
      telegram_id: 123456,
      username: 'alice',
      first_name: 'Alice',
      created_at: '2025-01-01',
      timezone: 'Europe/Moscow',
      current_level: 3,
      total_xp: 1200,
      is_active: true,
      avatar_id: 1,
      notification_enabled: true,
      reminder_time: 9,
    };
    mockQueryOne.mockResolvedValueOnce(fakeUser);

    const result = await getUserByTelegramId(123456);

    expect(result).toEqual(fakeUser);
    expect(mockQueryOne).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM users WHERE telegram_id'),
      [123456],
    );
  });

  it('returns null for an unknown telegram ID', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const result = await getUserByTelegramId(999999);

    expect(result).toBeNull();
    expect(mockQueryOne).toHaveBeenCalledWith(
      expect.stringContaining('telegram_id'),
      [999999],
    );
  });
});

describe('listAllModes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an array of mode rows', async () => {
    const fakeModes: ModeRow[] = [
      { id: 1, name: 'fitness', display_name: 'Fitness', description: 'Get fit', icon_emoji: null },
      { id: 2, name: 'study', display_name: 'Study', description: 'Learn stuff', icon_emoji: null },
    ];
    mockQuery.mockResolvedValueOnce(fakeModes as any);

    const result = await listAllModes();

    expect(result).toEqual(fakeModes);
    expect(result).toHaveLength(2);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM modes ORDER BY id'),
    );
  });

  it('returns an empty array when no modes exist', async () => {
    mockQuery.mockResolvedValueOnce([] as any);

    const result = await listAllModes();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

describe('getUserActiveModes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only active modes for the given user', async () => {
    const fakeActiveModes: UserActiveModeRow[] = [
      {
        mode_id: 1,
        name: 'fitness',
        display_name: 'Fitness',
        description: 'Stay active',
        icon_emoji: null,
        user_mode_id: 10,
        enabled_at: '2025-06-01',
        is_active: true,
      },
    ];
    mockQuery.mockResolvedValueOnce(fakeActiveModes as any);

    const result = await getUserActiveModes(42);

    expect(result).toEqual(fakeActiveModes);
    expect(result).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('um.is_active = true'),
      [42],
    );
  });

  it('returns empty array when user has no active modes', async () => {
    mockQuery.mockResolvedValueOnce([] as any);

    const result = await getUserActiveModes(99);

    expect(result).toEqual([]);
  });

  it('passes userId as query parameter', async () => {
    mockQuery.mockResolvedValueOnce([] as any);

    await getUserActiveModes(77);

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toEqual([77]);
  });
});
