/**
 * Tests for useCelebration hook (mini-app/src/hooks/useCelebration.ts)
 *
 * Run 62 Agent B: Tests the celebration hook that compares current level/XP
 * against stored localStorage values to trigger confetti, levelUp, or xpFloat
 * celebrations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCelebration } from '@/hooks/useCelebration';

// ─── localStorage setup ─────────────────────────────────────────────
// The global test setup already mocks localStorage.
// We just need to clear it between tests.

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// ─── Tests ──────────────────────────────────────────────────────────

describe('useCelebration', () => {
  it('stores baseline without celebrating on first call (no stored values)', () => {
    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.onDashboardData(5, 1200);
    });

    // Should not trigger any celebration
    expect(result.current.showConfetti).toBe(false);
    expect(result.current.showLevelUp).toBe(false);
    expect(result.current.showXpFloat).toBe(false);
    expect(result.current.levelUpData).toBe(0);
    expect(result.current.xpGained).toBe(0);

    // Should have stored values
    expect(localStorage.setItem).toHaveBeenCalledWith('celebration_last_level', '5');
    expect(localStorage.setItem).toHaveBeenCalledWith('celebration_last_xp', '1200');
  });

  it('triggers confetti + levelUp when level increased from stored value', () => {
    // Pre-store lower level
    localStorage.setItem('celebration_last_level', '4');
    localStorage.setItem('celebration_last_xp', '800');

    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.onDashboardData(5, 1200);
    });

    expect(result.current.showConfetti).toBe(true);
    expect(result.current.showLevelUp).toBe(true);
    expect(result.current.levelUpData).toBe(5);
    expect(result.current.showXpFloat).toBe(false);
  });

  it('triggers xpFloat when XP increased but level same', () => {
    // Pre-store same level but lower XP
    localStorage.setItem('celebration_last_level', '5');
    localStorage.setItem('celebration_last_xp', '1000');

    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.onDashboardData(5, 1200);
    });

    expect(result.current.showXpFloat).toBe(true);
    expect(result.current.xpGained).toBe(200);
    expect(result.current.showConfetti).toBe(false);
    expect(result.current.showLevelUp).toBe(false);
  });

  it('dismiss clears all celebration state', () => {
    // Pre-store lower level to trigger celebration
    localStorage.setItem('celebration_last_level', '3');
    localStorage.setItem('celebration_last_xp', '500');

    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.onDashboardData(5, 1200);
    });

    expect(result.current.showConfetti).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.showConfetti).toBe(false);
    expect(result.current.showLevelUp).toBe(false);
    expect(result.current.showXpFloat).toBe(false);
    expect(result.current.levelUpData).toBe(0);
    expect(result.current.xpGained).toBe(0);
  });

  it('dismissConfetti only clears confetti state', () => {
    localStorage.setItem('celebration_last_level', '3');
    localStorage.setItem('celebration_last_xp', '500');

    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.onDashboardData(5, 1200);
    });

    expect(result.current.showConfetti).toBe(true);
    expect(result.current.showLevelUp).toBe(true);

    act(() => {
      result.current.dismissConfetti();
    });

    expect(result.current.showConfetti).toBe(false);
    expect(result.current.showLevelUp).toBe(true); // still showing
  });

  it('dismissLevelUp only clears levelUp state', () => {
    localStorage.setItem('celebration_last_level', '3');
    localStorage.setItem('celebration_last_xp', '500');

    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.onDashboardData(5, 1200);
    });

    act(() => {
      result.current.dismissLevelUp();
    });

    expect(result.current.showLevelUp).toBe(false);
    expect(result.current.showConfetti).toBe(true); // still showing
  });

  it('dismissXpFloat only clears xpFloat state', () => {
    localStorage.setItem('celebration_last_level', '5');
    localStorage.setItem('celebration_last_xp', '1000');

    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.onDashboardData(5, 1500);
    });

    expect(result.current.showXpFloat).toBe(true);

    act(() => {
      result.current.dismissXpFloat();
    });

    expect(result.current.showXpFloat).toBe(false);
  });

  it('subsequent calls compare with stored values and trigger level-up', () => {
    const { result } = renderHook(() => useCelebration());

    // First call — no stored values, stores baseline
    act(() => {
      result.current.onDashboardData(5, 1200);
    });

    expect(result.current.showConfetti).toBe(false);

    // Second call — level increased
    act(() => {
      result.current.onDashboardData(6, 1500);
    });

    expect(result.current.showConfetti).toBe(true);
    expect(result.current.showLevelUp).toBe(true);
    expect(result.current.levelUpData).toBe(6);
  });

  it('subsequent calls compare with stored values and trigger xpFloat', () => {
    const { result } = renderHook(() => useCelebration());

    // First call — stores baseline
    act(() => {
      result.current.onDashboardData(5, 1200);
    });

    // Second call — same level, more XP
    act(() => {
      result.current.onDashboardData(5, 1400);
    });

    expect(result.current.showXpFloat).toBe(true);
    expect(result.current.xpGained).toBe(200);
  });

  it('handles missing localStorage gracefully', () => {
    // Simulate localStorage throwing
    const originalGetItem = localStorage.getItem;
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('SecurityError');
    });

    const { result } = renderHook(() => useCelebration());

    // Should not throw
    act(() => {
      result.current.onDashboardData(5, 1200);
    });

    // Since getStoredNumber returns null on error, it stores baseline
    expect(result.current.showConfetti).toBe(false);
    expect(result.current.showLevelUp).toBe(false);

    // Restore
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(originalGetItem);
  });

  it('does not celebrate when values are the same', () => {
    localStorage.setItem('celebration_last_level', '5');
    localStorage.setItem('celebration_last_xp', '1200');

    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.onDashboardData(5, 1200);
    });

    expect(result.current.showConfetti).toBe(false);
    expect(result.current.showLevelUp).toBe(false);
    expect(result.current.showXpFloat).toBe(false);
  });

  it('does not celebrate when values decrease', () => {
    localStorage.setItem('celebration_last_level', '5');
    localStorage.setItem('celebration_last_xp', '1200');

    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.onDashboardData(4, 900);
    });

    expect(result.current.showConfetti).toBe(false);
    expect(result.current.showLevelUp).toBe(false);
    expect(result.current.showXpFloat).toBe(false);
  });
});
