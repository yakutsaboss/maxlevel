/**
 * Smart Reminder Scheduler
 *
 * Calculates personalized reminder schedules based on mode configuration
 * and quiz responses. Currently supports hydration mode with interval-based
 * water intake reminders derived from wake/sleep times.
 */

import { logger } from './logger.js';

const log = logger.child({ component: 'smartReminder' });

/** A single reminder slot in the daily schedule. */
export interface ReminderSlot {
  /** Time in HH:MM format (24h, UTC-relative or user-tz). */
  time: string;
  /** Reminder category (e.g. 'hydration', 'fitness', 'medication'). */
  type: string;
  /** Human-readable reminder message. */
  message: string;
}

/** Default hydration settings when quiz responses are incomplete. */
const HYDRATION_DEFAULTS = {
  wakeTime: '07:00',
  sleepTime: '23:00',
  dailyGoalMl: 2500,
  intervalMinutes: 90,
};

/**
 * Calculate a full-day reminder schedule from a user's mode configuration.
 *
 * @param modeConfig - Object with mode name and quiz_responses JSONB
 * @returns Array of ReminderSlot sorted by time
 */
export function calculateReminderSchedule(modeConfig: {
  mode?: string;
  quiz_responses?: Record<string, unknown>;
}): ReminderSlot[] {
  const mode = modeConfig.mode ?? 'unknown';
  const responses = modeConfig.quiz_responses ?? {};

  log.info('Calculating reminder schedule', { mode });

  switch (mode) {
    case 'hydration':
      return buildHydrationSchedule(responses);
    case 'fitness':
      return buildFitnessSchedule(responses);
    case 'medication':
      return buildMedicationSchedule(responses);
    default:
      log.warn('No reminder schedule logic for mode', { mode });
      return [];
  }
}

/**
 * Build hydration reminder intervals between wake and sleep times.
 * Distributes reminders evenly across waking hours.
 */
function buildHydrationSchedule(
  responses: Record<string, unknown>
): ReminderSlot[] {
  const wakeTime = parseTimeStr(responses.wakeTime as string | undefined, HYDRATION_DEFAULTS.wakeTime);
  const sleepTime = parseTimeStr(responses.sleepTime as string | undefined, HYDRATION_DEFAULTS.sleepTime);
  const dailyGoalMl = typeof responses.dailyWaterMl === 'number'
    ? responses.dailyWaterMl
    : HYDRATION_DEFAULTS.dailyGoalMl;
  const intervalMin = typeof responses.reminderIntervalMin === 'number'
    ? responses.reminderIntervalMin
    : HYDRATION_DEFAULTS.intervalMinutes;

  const wakeMinutes = timeToMinutes(wakeTime);
  let sleepMinutes = timeToMinutes(sleepTime);
  // Handle next-day sleep times (e.g. sleep at 01:00)
  if (sleepMinutes <= wakeMinutes) sleepMinutes += 24 * 60;

  const awakeMinutes = sleepMinutes - wakeMinutes;
  const reminderCount = Math.max(1, Math.floor(awakeMinutes / intervalMin));
  const perReminderMl = Math.round(dailyGoalMl / reminderCount);

  const slots: ReminderSlot[] = [];

  for (let i = 0; i < reminderCount; i++) {
    const offsetMin = wakeMinutes + i * intervalMin;
    const time = minutesToTime(offsetMin % (24 * 60));

    slots.push({
      time,
      type: 'hydration',
      message: i === 0
        ? `Good morning! Start your day with a glass of water (${perReminderMl}ml)`
        : `Time to drink water! Aim for ${perReminderMl}ml (${i + 1}/${reminderCount})`,
    });
  }

  log.info('Hydration schedule built', {
    reminderCount: slots.length,
    dailyGoalMl,
    intervalMin,
  });

  return slots;
}

/**
 * Build simple fitness workout reminders based on scheduled days.
 */
function buildFitnessSchedule(
  responses: Record<string, unknown>
): ReminderSlot[] {
  const workoutTime = parseTimeStr(responses.preferredWorkoutTime as string | undefined, '08:00');
  const slots: ReminderSlot[] = [];

  // Pre-workout reminder (30 min before)
  const preMinutes = timeToMinutes(workoutTime) - 30;
  if (preMinutes >= 0) {
    slots.push({
      time: minutesToTime(preMinutes),
      type: 'fitness',
      message: 'Your workout starts in 30 minutes — time to get ready!',
    });
  }

  // Workout start reminder
  slots.push({
    time: workoutTime,
    type: 'fitness',
    message: 'Time for your workout! Stay consistent and keep your streak.',
  });

  return slots;
}

/**
 * Build medication schedule reminders from quiz responses.
 */
function buildMedicationSchedule(
  responses: Record<string, unknown>
): ReminderSlot[] {
  const times = Array.isArray(responses.medicationTimes)
    ? (responses.medicationTimes as string[])
    : ['09:00'];

  const slots: ReminderSlot[] = times.map((t, idx) => ({
    time: parseTimeStr(t, '09:00'),
    type: 'medication',
    message: times.length === 1
      ? 'Time to take your medication!'
      : `Medication reminder (${idx + 1}/${times.length})`,
  }));

  return slots;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Parse a "HH:MM" string, returning fallback if invalid. */
function parseTimeStr(value: string | undefined, fallback: string): string {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return fallback;
  const [h, m] = value.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return fallback;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Convert "HH:MM" to total minutes since midnight. */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convert total minutes to "HH:MM" format. */
function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
