/**
 * Hydration Plan Generator
 *
 * Generates a personalized hydration plan from onboarding quiz responses.
 * Rule-based generation — no AI calls.
 */

import { logger } from './logger.js';
import type { QuizResponses, HydrationPlan, HydrationTargets } from './planTypes.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Milliliters per glass (standard 250ml). */
const ML_PER_GLASS = 250;

/** Container sizes in ml. */
const CONTAINER_ML: Record<string, number> = {
  glass: 250,
  bottle: 500,
  large_bottle: 750,
  jug: 1000,
};

/** Reminder frequency → minutes between reminders. */
const REMINDER_MINUTES: Record<string, number> = {
  '30min': 30,
  '1h': 60,
  '2h': 120,
  '3h': 180,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function buildHydrationRecommendations(
  dailyTarget: number,
  currentIntake: string,
  goals: string[],
  container: string,
): string[] {
  const recs: string[] = [];

  if (currentIntake === 'very_low' || currentIntake === 'low') {
    recs.push('You are currently drinking less than optimal — increase gradually over 1-2 weeks to avoid discomfort.');
  }

  const containerMl = CONTAINER_ML[container] || 250;
  const refills = Math.ceil((dailyTarget * ML_PER_GLASS) / containerMl);
  recs.push(`With your ${container.replace('_', ' ')} (${containerMl}ml), aim for about ${refills} refill${refills > 1 ? 's' : ''} per day.`);

  if (goals.includes('skin')) {
    recs.push('For skin benefits, spread your water intake evenly throughout the day rather than drinking large amounts at once.');
  }
  if (goals.includes('energy')) {
    recs.push('Drink a full glass of water right after waking up to kickstart your metabolism and energy levels.');
  }
  if (goals.includes('weight_loss')) {
    recs.push('Drink a glass of water 30 minutes before meals — this can help reduce calorie intake.');
  }
  if (goals.includes('athletic')) {
    recs.push('During workouts, drink 200-300ml every 15-20 minutes to maintain performance.');
  }

  recs.push('Keep a water container visible on your desk or near you at all times as a visual reminder.');

  if (dailyTarget >= 12) {
    recs.push('With a high target, consider adding electrolytes to prevent over-dilution, especially in warm weather.');
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function generateHydrationPlan(responses: QuizResponses): HydrationPlan {
  const log = logger.child({ component: 'hydrationPlanGenerator', mode: 'hydration' });

  const dailyTarget: number = parseInt(String(responses.daily_target ?? ''), 10) || 8;
  const container: string = String(responses.container || 'glass');
  const reminderFreq: string = String(responses.reminder_frequency || '2h');
  const goals: string[] = (Array.isArray(responses.goals) ? responses.goals : ['health']) as string[];
  const currentIntake: string = String(responses.current_intake || 'low');

  const wakeTimeObj = responses.wake_time as Record<string, unknown> | string | undefined;
  const wakeTime: string = (typeof wakeTimeObj === 'object' && wakeTimeObj !== null ? String(wakeTimeObj.wake_time || '08:00') : String(wakeTimeObj || '08:00'));
  const sleepTimeVal = typeof wakeTimeObj === 'object' && wakeTimeObj !== null ? wakeTimeObj.sleep_time : responses.sleep_time;
  const sleepTime: string = String(sleepTimeVal || '23:00');

  const dailyMl = dailyTarget * ML_PER_GLASS;
  const reminderIntervalMinutes = REMINDER_MINUTES[reminderFreq] || 120;

  const targets: HydrationTargets = {
    dailyGlasses: dailyTarget,
    dailyMl,
    reminderIntervalMinutes,
    wakeTime,
    sleepTime,
  };

  const recommendations = buildHydrationRecommendations(dailyTarget, currentIntake, goals, container);

  log.info('Hydration plan generated', { dailyTarget, dailyMl, reminderIntervalMinutes });

  return {
    mode: 'hydration',
    targets,
    recommendations,
    created_at: new Date().toISOString(),
  };
}
