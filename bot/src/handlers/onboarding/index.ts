/**
 * Onboarding Handler - Re-exports from sub-modules
 *
 * Sub-modules:
 * - setup.ts: Entry point (handleOnboarding)
 * - modeSelection.ts: Mode listing, selection, toggling, management
 * - completion.ts: Mode selection finalization + initial quest assignment
 * - quickActions.ts: Post-onboarding quick action buttons
 */

export { handleOnboarding } from './setup.js';
export {
  showModeSelection,
  handleModeSelection,
  handleModesCommand,
  handleModeSummary,
} from './modeSelection.js';
export { completeModeSelection } from './completion.js';
export { handleQuickAction } from './quickActions.js';
