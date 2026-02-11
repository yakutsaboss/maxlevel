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

// Telegram WebApp types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date: number;
    hash: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{ id?: string; type?: string; text: string }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  sendData: (data: string) => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}
