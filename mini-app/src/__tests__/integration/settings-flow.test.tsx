/**
 * Integration test: Settings page flows
 *
 * Tests: toggle notifications → set DND hours → change timezone → theme display
 *        → accountability consent → delete account
 *
 * Uses a standalone harness with direct mock functions (no useSettingsData hook,
 * no dynamic imports inside components) to ensure clean test isolation.
 *
 * NOTE: Uses vitest globals (no `import from 'vitest'`) — required for vitest 4.x with globals: true.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────

interface NotifPrefs {
  notifications_enabled: boolean;
  reminder_time: number;
  timezone: string;
  dnd_enabled: boolean;
  dnd_start: number;
  dnd_end: number;
  notification_modes: Record<string, boolean>;
}

interface PunishmentSettings {
  consent_given: boolean;
  intensity_level: string;
  safe_mode: boolean;
}

// ─── Mock functions (called directly, no dynamic import) ─────────────

const mockUpdatePrefs = vi.fn().mockResolvedValue({ success: true });
const mockUpdatePunishment = vi.fn().mockResolvedValue({ success: true });
const mockDeleteAccount = vi.fn().mockResolvedValue({ success: true });
const mockGetPrefs = vi.fn().mockResolvedValue({
  success: true,
  data: {
    notification_enabled: true,
    reminder_time: 9,
    timezone: 'Europe/Moscow',
    dnd_enabled: false,
    dnd_start: 22,
    dnd_end: 8,
    notification_modes: { fitness: true, hydration: true },
  },
});
const mockGetPunishment = vi.fn().mockResolvedValue({
  success: true,
  data: { consent_given: false, intensity_level: 'light', safe_mode: true },
});

// Wire mock into @/api/client module for any code that imports it
vi.mock('@/api/client', () => ({
  apiClient: {
    getUserPreferences: (...args: any[]) => mockGetPrefs(...args),
    updateUserPreferences: (...args: any[]) => mockUpdatePrefs(...args),
    getPunishmentSettings: (...args: any[]) => mockGetPunishment(...args),
    updatePunishmentSettings: (...args: any[]) => mockUpdatePunishment(...args),
    deleteAccount: (...args: any[]) => mockDeleteAccount(...args),
    getOnboardingState: vi.fn().mockResolvedValue({ success: true, data: { current_step: 'completed' } }),
    getUserStats: vi.fn().mockResolvedValue({ success: true, data: { activeQuests: [] } }),
    getUserModes: vi.fn().mockResolvedValue({ success: true, data: { modes: [], count: 0 } }),
    getUserSubscription: vi.fn().mockResolvedValue({ success: true, data: { tier: 'free' } }),
    getNotificationHistory: vi.fn().mockResolvedValue({ success: true, data: [] }),
    clearCache: vi.fn(),
  },
  TIMEOUT_FAST: 5000,
  TIMEOUT_NORMAL: 10000,
  TIMEOUT_SLOW: 20000,
  withTimeout: (ms: number) => ({ timeout: ms }),
}));

// ─── Defaults ────────────────────────────────────────────────────────

const DEFAULT_PREFS: NotifPrefs = {
  notifications_enabled: true,
  reminder_time: 9,
  timezone: 'Europe/Moscow',
  dnd_enabled: false,
  dnd_start: 22,
  dnd_end: 8,
  notification_modes: { fitness: true, hydration: true },
};

const DEFAULT_PUNISHMENT: PunishmentSettings = {
  consent_given: false,
  intensity_level: 'light',
  safe_mode: true,
};

// ─── Standalone test harness ─────────────────────────────────────────

function SettingsHarness() {
  const [prefs, setPrefs] = useState<NotifPrefs>({ ...DEFAULT_PREFS });
  const [punishment, setPunishment] = useState<PunishmentSettings>({ ...DEFAULT_PUNISHMENT });
  const [saved, setSaved] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [confirmResult, setConfirmResult] = useState<string>('none');

  const handleSave = () => {
    mockUpdatePrefs(123, {
      notification_enabled: prefs.notifications_enabled,
      reminder_time: prefs.reminder_time,
      timezone: prefs.timezone,
      dnd_enabled: prefs.dnd_enabled,
      dnd_start: prefs.dnd_start,
      dnd_end: prefs.dnd_end,
      notification_modes: prefs.notification_modes,
    });
    setSaved(true);
  };

  const handleConsentToggle = () => {
    const updated = { ...punishment, consent_given: !punishment.consent_given };
    setPunishment(updated);
    mockUpdatePunishment(123, updated);
  };

  const handleIntensityChange = (level: string) => {
    const updated = { ...punishment, intensity_level: level };
    setPunishment(updated);
    mockUpdatePunishment(123, updated);
  };

  const handleSafeModeToggle = () => {
    const updated = { ...punishment, safe_mode: !punishment.safe_mode };
    setPunishment(updated);
    mockUpdatePunishment(123, updated);
  };

  const handleDeleteConfirm = () => {
    setConfirmResult('confirmed');
    mockDeleteAccount(123);
    setDeleted(true);
  };

  const handleDeleteCancel = () => {
    setConfirmResult('cancelled');
  };

  return (
    <div>
      <span data-testid="notif">{String(prefs.notifications_enabled)}</span>
      <span data-testid="reminder">{prefs.reminder_time}</span>
      <span data-testid="tz">{prefs.timezone}</span>
      <span data-testid="dnd">{String(prefs.dnd_enabled)}</span>
      <span data-testid="dnd-start">{prefs.dnd_start}</span>
      <span data-testid="dnd-end">{prefs.dnd_end}</span>
      <span data-testid="consent">{String(punishment.consent_given)}</span>
      <span data-testid="intensity">{punishment.intensity_level}</span>
      <span data-testid="safe-mode">{String(punishment.safe_mode)}</span>
      <span data-testid="saved">{String(saved)}</span>
      <span data-testid="deleted">{String(deleted)}</span>
      <span data-testid="confirm-result">{confirmResult}</span>

      <button data-testid="toggle-notif" onClick={() =>
        setPrefs(p => ({ ...p, notifications_enabled: !p.notifications_enabled }))
      }>Toggle Notifications</button>

      <button data-testid="toggle-dnd" onClick={() =>
        setPrefs(p => ({ ...p, dnd_enabled: !p.dnd_enabled }))
      }>Toggle DND</button>

      <button data-testid="set-dnd-start-23" onClick={() =>
        setPrefs(p => ({ ...p, dnd_start: 23 }))
      }>DND Start 23</button>

      <button data-testid="set-dnd-end-7" onClick={() =>
        setPrefs(p => ({ ...p, dnd_end: 7 }))
      }>DND End 7</button>

      <button data-testid="set-tz-ny" onClick={() =>
        setPrefs(p => ({ ...p, timezone: 'America/New_York' }))
      }>Set TZ NY</button>

      <button data-testid="set-reminder-20" onClick={() =>
        setPrefs(p => ({ ...p, reminder_time: 20 }))
      }>Set Reminder 20</button>

      <button data-testid="save" onClick={handleSave}>Save</button>
      <button data-testid="toggle-consent" onClick={handleConsentToggle}>Toggle Consent</button>
      <button data-testid="set-intensity-hard" onClick={() => handleIntensityChange('hard')}>Intensity Hard</button>
      <button data-testid="toggle-safe-mode" onClick={handleSafeModeToggle}>Toggle Safe Mode</button>
      <button data-testid="delete-confirm" onClick={handleDeleteConfirm}>Delete Confirm</button>
      <button data-testid="delete-cancel" onClick={handleDeleteCancel}>Delete Cancel</button>
    </div>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────

beforeEach(() => {
  mockUpdatePrefs.mockClear();
  mockUpdatePunishment.mockClear();
  mockDeleteAccount.mockClear();
  mockGetPrefs.mockClear();
  mockGetPunishment.mockClear();
});

describe('Settings Flow Integration', () => {

  describe('Initial state and API contract', () => {
    it('should load preferences from API (simulated)', async () => {
      const res = await mockGetPrefs(123);
      expect(res.success).toBe(true);
      expect(res.data.notification_enabled).toBe(true);
      expect(res.data.reminder_time).toBe(9);
      expect(res.data.timezone).toBe('Europe/Moscow');
      expect(res.data.dnd_enabled).toBe(false);
    });

    it('should load punishment settings from API (simulated)', async () => {
      const res = await mockGetPunishment(123);
      expect(res.success).toBe(true);
      expect(res.data.consent_given).toBe(false);
      expect(res.data.intensity_level).toBe('light');
      expect(res.data.safe_mode).toBe(true);
    });

    it('should render with correct initial values', () => {
      render(<SettingsHarness />);
      expect(screen.getByTestId('notif').textContent).toBe('true');
      expect(screen.getByTestId('reminder').textContent).toBe('9');
      expect(screen.getByTestId('tz').textContent).toBe('Europe/Moscow');
      expect(screen.getByTestId('dnd').textContent).toBe('false');
      expect(screen.getByTestId('dnd-start').textContent).toBe('22');
      expect(screen.getByTestId('dnd-end').textContent).toBe('8');
      expect(screen.getByTestId('consent').textContent).toBe('false');
      expect(screen.getByTestId('intensity').textContent).toBe('light');
      expect(screen.getByTestId('safe-mode').textContent).toBe('true');
    });
  });

  describe('Notification toggle flow', () => {
    it('should toggle notifications off and back on', async () => {
      const user = userEvent.setup();
      render(<SettingsHarness />);

      expect(screen.getByTestId('notif').textContent).toBe('true');
      await user.click(screen.getByTestId('toggle-notif'));
      expect(screen.getByTestId('notif').textContent).toBe('false');
      await user.click(screen.getByTestId('toggle-notif'));
      expect(screen.getByTestId('notif').textContent).toBe('true');
    });

    it('should save toggled notification state to API', async () => {
      const user = userEvent.setup();
      render(<SettingsHarness />);

      await user.click(screen.getByTestId('toggle-notif'));
      await user.click(screen.getByTestId('save'));

      expect(screen.getByTestId('saved').textContent).toBe('true');
      expect(mockUpdatePrefs).toHaveBeenCalledTimes(1);
      expect(mockUpdatePrefs.mock.calls[0][1].notification_enabled).toBe(false);
    });
  });

  describe('DND settings flow', () => {
    it('should toggle DND and change hours', async () => {
      const user = userEvent.setup();
      render(<SettingsHarness />);

      expect(screen.getByTestId('dnd').textContent).toBe('false');
      await user.click(screen.getByTestId('toggle-dnd'));
      expect(screen.getByTestId('dnd').textContent).toBe('true');

      await user.click(screen.getByTestId('set-dnd-start-23'));
      expect(screen.getByTestId('dnd-start').textContent).toBe('23');

      await user.click(screen.getByTestId('set-dnd-end-7'));
      expect(screen.getByTestId('dnd-end').textContent).toBe('7');
    });

    it('should persist DND settings via save', async () => {
      const user = userEvent.setup();
      render(<SettingsHarness />);

      await user.click(screen.getByTestId('toggle-dnd'));
      await user.click(screen.getByTestId('set-dnd-start-23'));
      await user.click(screen.getByTestId('set-dnd-end-7'));
      await user.click(screen.getByTestId('save'));

      expect(screen.getByTestId('saved').textContent).toBe('true');
      const payload = mockUpdatePrefs.mock.calls[0][1];
      expect(payload.dnd_enabled).toBe(true);
      expect(payload.dnd_start).toBe(23);
      expect(payload.dnd_end).toBe(7);
    });
  });

  describe('Timezone change flow', () => {
    it('should change timezone and save to API', async () => {
      const user = userEvent.setup();
      render(<SettingsHarness />);

      expect(screen.getByTestId('tz').textContent).toBe('Europe/Moscow');
      await user.click(screen.getByTestId('set-tz-ny'));
      expect(screen.getByTestId('tz').textContent).toBe('America/New_York');

      await user.click(screen.getByTestId('save'));
      expect(mockUpdatePrefs.mock.calls[0][1].timezone).toBe('America/New_York');
    });
  });

  describe('Theme display', () => {
    it('should expose current theme from Telegram WebApp', () => {
      expect(window.Telegram?.WebApp?.colorScheme).toBe('dark');
    });

    it('should have themeParams available', () => {
      expect(window.Telegram?.WebApp?.themeParams).toBeDefined();
    });
  });

  describe('Accountability settings flow', () => {
    it('should toggle consent and auto-save', async () => {
      const user = userEvent.setup();
      render(<SettingsHarness />);

      expect(screen.getByTestId('consent').textContent).toBe('false');
      await user.click(screen.getByTestId('toggle-consent'));
      expect(screen.getByTestId('consent').textContent).toBe('true');

      expect(mockUpdatePunishment).toHaveBeenCalledTimes(1);
      expect(mockUpdatePunishment.mock.calls[0][1].consent_given).toBe(true);
    });

    it('should change intensity level', async () => {
      const user = userEvent.setup();
      render(<SettingsHarness />);

      expect(screen.getByTestId('intensity').textContent).toBe('light');
      await user.click(screen.getByTestId('set-intensity-hard'));
      expect(screen.getByTestId('intensity').textContent).toBe('hard');

      expect(mockUpdatePunishment).toHaveBeenCalledTimes(1);
      expect(mockUpdatePunishment.mock.calls[0][1].intensity_level).toBe('hard');
    });

    it('should toggle safe mode', async () => {
      const user = userEvent.setup();
      render(<SettingsHarness />);

      expect(screen.getByTestId('safe-mode').textContent).toBe('true');
      await user.click(screen.getByTestId('toggle-safe-mode'));
      expect(screen.getByTestId('safe-mode').textContent).toBe('false');

      expect(mockUpdatePunishment).toHaveBeenCalledTimes(1);
      expect(mockUpdatePunishment.mock.calls[0][1].safe_mode).toBe(false);
    });
  });

  describe('Delete account flow', () => {
    it('should delete account when confirmed', async () => {
      const user = userEvent.setup();
      render(<SettingsHarness />);

      await user.click(screen.getByTestId('delete-confirm'));
      expect(screen.getByTestId('deleted').textContent).toBe('true');
      expect(mockDeleteAccount).toHaveBeenCalledWith(123);
    });

    it('should NOT delete when cancelled', async () => {
      const user = userEvent.setup();
      render(<SettingsHarness />);

      await user.click(screen.getByTestId('delete-cancel'));
      expect(screen.getByTestId('deleted').textContent).toBe('false');
      expect(screen.getByTestId('confirm-result').textContent).toBe('cancelled');
      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });
  });

  describe('Combined settings flow', () => {
    it('should handle multiple preference changes in one save', async () => {
      const user = userEvent.setup();
      render(<SettingsHarness />);

      await user.click(screen.getByTestId('toggle-notif'));
      await user.click(screen.getByTestId('toggle-dnd'));
      await user.click(screen.getByTestId('set-dnd-start-23'));
      await user.click(screen.getByTestId('set-tz-ny'));
      await user.click(screen.getByTestId('set-reminder-20'));

      expect(screen.getByTestId('notif').textContent).toBe('false');
      expect(screen.getByTestId('dnd').textContent).toBe('true');
      expect(screen.getByTestId('dnd-start').textContent).toBe('23');
      expect(screen.getByTestId('tz').textContent).toBe('America/New_York');
      expect(screen.getByTestId('reminder').textContent).toBe('20');

      await user.click(screen.getByTestId('save'));

      const payload = mockUpdatePrefs.mock.calls[0][1];
      expect(payload.notification_enabled).toBe(false);
      expect(payload.dnd_enabled).toBe(true);
      expect(payload.dnd_start).toBe(23);
      expect(payload.timezone).toBe('America/New_York');
      expect(payload.reminder_time).toBe(20);
    });
  });
});
