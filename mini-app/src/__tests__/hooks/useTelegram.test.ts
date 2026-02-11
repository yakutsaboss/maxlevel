import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { isHapticEnabled, setHapticEnabled } from '@/hooks/useTelegram';

// Mock @twa-dev/sdk to return our global window.Telegram.WebApp mock
vi.mock('@twa-dev/sdk', () => ({
  default: (window as any).Telegram.WebApp,
}));

describe('useTelegram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('returns WebApp object and user data', async () => {
    // Dynamic import after mock is set up
    const { useTelegram } = await import('@/hooks/useTelegram');
    const { result } = renderHook(() => useTelegram());

    expect(result.current.tg).toBeDefined();
    expect(result.current.user).toEqual({ id: 123, first_name: 'Test' });
    expect(result.current.platform).toBe('tdesktop');
    expect(result.current.version).toBe('7.0');
    expect(result.current.colorScheme).toBe('dark');
  });

  it('haptic.impact calls HapticFeedback.impactOccurred when enabled', async () => {
    // Haptics are enabled by default (localStorage empty → true)
    const { useTelegram } = await import('@/hooks/useTelegram');
    const { result } = renderHook(() => useTelegram());

    act(() => {
      result.current.haptic.impact('light');
    });

    expect((window as any).Telegram.WebApp.HapticFeedback.impactOccurred).toHaveBeenCalledWith('light');
  });

  it('haptic.impact is a no-op when disabled', async () => {
    // Disable haptics
    setHapticEnabled(false);

    const { useTelegram } = await import('@/hooks/useTelegram');
    const { result } = renderHook(() => useTelegram());

    act(() => {
      result.current.haptic.impact('medium');
    });

    expect((window as any).Telegram.WebApp.HapticFeedback.impactOccurred).not.toHaveBeenCalled();
  });

  it('isHapticEnabled reads from localStorage (defaults to true)', () => {
    // No value set → default true
    expect(isHapticEnabled()).toBe(true);

    // Set to disabled
    localStorage.setItem('haptic_enabled', '0');
    expect(isHapticEnabled()).toBe(false);

    // Set to enabled
    localStorage.setItem('haptic_enabled', '1');
    expect(isHapticEnabled()).toBe(true);
  });

  it('setHapticEnabled writes to localStorage', () => {
    setHapticEnabled(false);
    expect(localStorage.setItem).toHaveBeenCalledWith('haptic_enabled', '0');

    setHapticEnabled(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('haptic_enabled', '1');
  });

  it('haptic.notification calls notificationOccurred when enabled', async () => {
    const { useTelegram } = await import('@/hooks/useTelegram');
    const { result } = renderHook(() => useTelegram());

    act(() => {
      result.current.haptic.notification('success');
    });

    expect((window as any).Telegram.WebApp.HapticFeedback.notificationOccurred).toHaveBeenCalledWith('success');
  });
});
