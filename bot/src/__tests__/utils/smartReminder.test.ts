/**
 * Tests for Smart Reminder Scheduler (bot/src/utils/smartReminder.ts)
 *
 * Tests: calculateReminderSchedule for hydration, fitness, medication modes,
 *        time parsing edge cases, unsupported modes, cross-midnight schedules.
 * Mocks: logger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();

vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      info: (...args: any[]) => mockLogInfo(...args),
      warn: (...args: any[]) => mockLogWarn(...args),
      error: vi.fn(),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { calculateReminderSchedule } from '../../utils/smartReminder.js';
import type { ReminderSlot } from '../../utils/smartReminder.js';

// ─── Tests ──────────────────────────────────────────────────────────

describe('calculateReminderSchedule — unsupported/missing mode', () => {
  it('returns empty array for unsupported mode', () => {
    const result = calculateReminderSchedule({ mode: 'cooking' });
    expect(result).toEqual([]);
  });

  it('returns empty array when mode is undefined', () => {
    const result = calculateReminderSchedule({});
    expect(result).toEqual([]);
  });
});

describe('calculateReminderSchedule — hydration mode', () => {
  it('uses defaults when quiz_responses is empty', () => {
    const slots = calculateReminderSchedule({ mode: 'hydration' });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].type).toBe('hydration');
    expect(slots[0].time).toBe('07:00'); // default wake time
  });

  it('generates correct number of reminders based on interval', () => {
    // Wake 08:00, sleep 20:00 = 720 awake minutes / 60 min interval = 12 reminders
    const slots = calculateReminderSchedule({
      mode: 'hydration',
      quiz_responses: {
        wakeTime: '08:00',
        sleepTime: '20:00',
        reminderIntervalMin: 60,
      },
    });

    expect(slots).toHaveLength(12);
  });

  it('first reminder message says "Good morning"', () => {
    const slots = calculateReminderSchedule({ mode: 'hydration' });

    expect(slots[0].message).toContain('Good morning');
  });

  it('subsequent reminders show progress counter', () => {
    const slots = calculateReminderSchedule({
      mode: 'hydration',
      quiz_responses: {
        wakeTime: '08:00',
        sleepTime: '10:00',
        reminderIntervalMin: 30,
      },
    });

    // 120 min / 30 = 4 reminders
    expect(slots).toHaveLength(4);
    expect(slots[1].message).toContain('2/4');
    expect(slots[2].message).toContain('3/4');
    expect(slots[3].message).toContain('4/4');
  });

  it('distributes daily ml evenly across reminders', () => {
    const slots = calculateReminderSchedule({
      mode: 'hydration',
      quiz_responses: {
        wakeTime: '08:00',
        sleepTime: '12:00',
        reminderIntervalMin: 60,
        dailyWaterMl: 2000,
      },
    });

    // 240 min / 60 = 4 reminders, 2000/4 = 500ml each
    expect(slots).toHaveLength(4);
    expect(slots[0].message).toContain('500ml');
  });

  it('handles cross-midnight sleep times (e.g. sleep at 01:00)', () => {
    const slots = calculateReminderSchedule({
      mode: 'hydration',
      quiz_responses: {
        wakeTime: '22:00',
        sleepTime: '01:00',
        reminderIntervalMin: 60,
      },
    });

    // 22:00 to 01:00 next day = 180 min / 60 = 3 reminders
    expect(slots).toHaveLength(3);
    expect(slots[0].time).toBe('22:00');
    expect(slots[1].time).toBe('23:00');
    expect(slots[2].time).toBe('00:00');
  });

  it('uses fallback for invalid wakeTime format', () => {
    const slots = calculateReminderSchedule({
      mode: 'hydration',
      quiz_responses: { wakeTime: 'invalid' },
    });

    // Falls back to 07:00 default
    expect(slots[0].time).toBe('07:00');
  });
});

describe('calculateReminderSchedule — fitness mode', () => {
  it('returns 2 reminders by default (pre-workout + workout)', () => {
    const slots = calculateReminderSchedule({ mode: 'fitness' });

    expect(slots).toHaveLength(2);
    expect(slots[0].type).toBe('fitness');
    expect(slots[1].type).toBe('fitness');
  });

  it('pre-workout reminder is 30 minutes before workout time', () => {
    const slots = calculateReminderSchedule({
      mode: 'fitness',
      quiz_responses: { preferredWorkoutTime: '10:00' },
    });

    expect(slots[0].time).toBe('09:30');
    expect(slots[0].message).toContain('30 minutes');
    expect(slots[1].time).toBe('10:00');
  });

  it('uses default 08:00 when preferredWorkoutTime is not set', () => {
    const slots = calculateReminderSchedule({ mode: 'fitness' });

    expect(slots[0].time).toBe('07:30'); // 30 min before 08:00
    expect(slots[1].time).toBe('08:00');
  });

  it('omits pre-workout reminder when workout time is too early (< 00:30)', () => {
    const slots = calculateReminderSchedule({
      mode: 'fitness',
      quiz_responses: { preferredWorkoutTime: '00:15' },
    });

    // 00:15 - 30 = -15 minutes → pre-workout skipped
    expect(slots).toHaveLength(1);
    expect(slots[0].time).toBe('00:15');
  });
});

describe('calculateReminderSchedule — medication mode', () => {
  it('creates reminders for each medication time', () => {
    const slots = calculateReminderSchedule({
      mode: 'medication',
      quiz_responses: { medicationTimes: ['09:00', '14:00', '21:00'] },
    });

    expect(slots).toHaveLength(3);
    expect(slots[0].time).toBe('09:00');
    expect(slots[1].time).toBe('14:00');
    expect(slots[2].time).toBe('21:00');
    expect(slots.every(s => s.type === 'medication')).toBe(true);
  });

  it('defaults to 09:00 when medicationTimes is not an array', () => {
    const slots = calculateReminderSchedule({ mode: 'medication' });

    expect(slots).toHaveLength(1);
    expect(slots[0].time).toBe('09:00');
  });

  it('shows indexed messages for multiple medication times', () => {
    const slots = calculateReminderSchedule({
      mode: 'medication',
      quiz_responses: { medicationTimes: ['08:00', '20:00'] },
    });

    expect(slots[0].message).toContain('1/2');
    expect(slots[1].message).toContain('2/2');
  });

  it('shows simple message for single medication time', () => {
    const slots = calculateReminderSchedule({
      mode: 'medication',
      quiz_responses: { medicationTimes: ['09:00'] },
    });

    expect(slots[0].message).toBe('Time to take your medication!');
  });
});
