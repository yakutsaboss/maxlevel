/**
 * Typed interfaces for Telegram WebApp haptic feedback,
 * replacing all `(...args: any[]) => void` across the codebase.
 */

/** Valid styles for impact haptic feedback */
export type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

/** Valid types for notification haptic feedback */
export type NotificationType = 'error' | 'success' | 'warning';

/** Full haptic feedback interface matching useTelegram() return shape */
export interface HapticFeedback {
  impact: (style?: ImpactStyle) => void;
  notification: (type: NotificationType) => void;
  selection: () => void;
}

/** Haptic prop with only impact — used by most display components */
export interface HapticImpactOnly {
  impact: (style?: ImpactStyle) => void;
}

/** Haptic prop with selection + impact — used by settings components */
export interface HapticWithSelection {
  selection: () => void;
  impact: (style?: ImpactStyle) => void;
}

/** Haptic prop with impact + notification — used by dashboard/settings hooks */
export interface HapticWithNotification {
  impact: (style?: ImpactStyle) => void;
  notification: (type: NotificationType) => void;
}

/** Full haptic prop with all three methods — used by settings data hook */
export interface HapticFull {
  impact: (style?: ImpactStyle) => void;
  notification: (type: NotificationType) => void;
  selection: () => void;
}

/**
 * Quiz answer value — the possible types stored as onboarding quiz answers.
 * Covers: single-select (string), multi-select (string[]), drum-roller (number or {value, unit}),
 * slider (number), day-grid (string[]), dual-time (string formatted as "HH:00").
 */
export type QuizAnswerValue = string | string[] | number | { value: number; unit: string };
