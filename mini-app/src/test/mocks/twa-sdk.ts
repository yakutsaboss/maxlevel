import { vi } from 'vitest';

/**
 * Complete mock of @twa-dev/sdk WebApp object.
 * All methods are vi.fn() stubs; primitive properties have sensible defaults.
 * Import `setupTWAMock()` in test setup to attach it to `window.Telegram.WebApp`.
 */
export const mockWebApp = {
  // Core data
  initData: 'test',
  initDataUnsafe: {
    user: { id: 123, first_name: 'Test' },
  },

  // Lifecycle
  ready: vi.fn(),
  expand: vi.fn(),
  close: vi.fn(),

  // Viewport
  isExpanded: true,
  viewportHeight: 600,
  viewportStableHeight: 600,

  // Platform info
  platform: 'tdesktop',
  colorScheme: 'dark' as const,
  themeParams: {},
  version: '7.0',

  // Closing confirmation
  disableClosingConfirmation: vi.fn(),
  enableClosingConfirmation: vi.fn(),

  // Vertical swipes
  enableVerticalSwipes: vi.fn(),
  disableVerticalSwipes: vi.fn(),
  isVerticalSwipesEnabled: true,

  // Appearance
  setHeaderColor: vi.fn(),
  setBackgroundColor: vi.fn(),

  // Haptic feedback
  HapticFeedback: {
    impactOccurred: vi.fn(),
    notificationOccurred: vi.fn(),
    selectionChanged: vi.fn(),
  },

  // Back button
  BackButton: {
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
  },

  // Main button
  MainButton: {
    show: vi.fn(),
    hide: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    setText: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
    showProgress: vi.fn(),
    hideProgress: vi.fn(),
    color: '',
    textColor: '',
  },

  // Popups & dialogs
  showPopup: vi.fn(),
  showAlert: vi.fn(),
  showConfirm: vi.fn(),

  // Navigation
  openLink: vi.fn(),
  openTelegramLink: vi.fn(),
  openInvoice: vi.fn(),

  // Inline mode
  switchInlineQuery: vi.fn(),

  // Data exchange
  sendData: vi.fn(),

  // Permissions
  requestWriteAccess: vi.fn(),
  requestContact: vi.fn(),
};

/**
 * Attach the mock WebApp to `window.Telegram.WebApp`.
 * Called from `test/setup.ts` so every test gets the mock automatically.
 */
export function setupTWAMock(): void {
  Object.defineProperty(window, 'Telegram', {
    value: { WebApp: mockWebApp },
    writable: true,
  });
}
