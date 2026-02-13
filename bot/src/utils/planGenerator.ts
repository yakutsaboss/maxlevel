/**
 * Personalized Plan Generator — Orchestrator
 *
 * Delegates to mode-specific generators based on modeConfig.mode.
 * Types are re-exported from planTypes.ts for backward compatibility.
 *
 * Usage:
 *   import { generatePlan } from './planGenerator.js';
 *   const plan = generatePlan({ mode: 'fitness', quiz_responses: {...} });
 */

import { logger } from './logger.js';
import { generateFitnessPlan } from './fitnessPlanGenerator.js';
import { generateHydrationPlan } from './hydrationPlanGenerator.js';
import type { ModeConfig, PlanType } from './planTypes.js';

// Re-export all types so existing consumers don't break
export type {
  FitnessScheduleDay,
  FitnessPlan,
  HydrationTargets,
  HydrationPlan,
  PlanType,
  QuizResponses,
  ModeConfig,
} from './planTypes.js';

/**
 * Generate a personalized plan from onboarding quiz responses.
 * Returns null for unsupported modes.
 */
export function generatePlan(modeConfig: ModeConfig): PlanType | null {
  const { mode, quiz_responses } = modeConfig;
  const log = logger.child({ component: 'planGenerator', mode });

  if (!quiz_responses || typeof quiz_responses !== 'object') {
    log.warn('Cannot generate plan: missing or invalid quiz_responses');
    return null;
  }

  log.info('Generating personalized plan', { responseKeys: Object.keys(quiz_responses) });

  if (mode === 'fitness') return generateFitnessPlan(quiz_responses);
  if (mode === 'hydration') return generateHydrationPlan(quiz_responses);

  log.warn('Unsupported mode for plan generation', { mode });
  return null;
}
