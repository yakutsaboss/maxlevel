/**
 * Onboarding Handler - Re-exports from onboarding/ sub-modules
 *
 * This file preserves backward compatibility for existing imports:
 *   import { handleOnboarding } from '../handlers/onboarding.js'
 *
 * The actual implementation lives in:
 * - onboarding/setup.ts: Entry point (handleOnboarding)
 * - onboarding/modeSelection.ts: Mode listing, selection, toggling, management
 * - onboarding/completion.ts: Mode selection finalization + initial quest assignment
 * - onboarding/quickActions.ts: Post-onboarding quick action buttons
 */

export {
  handleOnboarding,
  showModeSelection,
  handleModeSelection,
  handleModesCommand,
  handleModeSummary,
  completeModeSelection,
  handleQuickAction,
} from './onboarding/index.js';
