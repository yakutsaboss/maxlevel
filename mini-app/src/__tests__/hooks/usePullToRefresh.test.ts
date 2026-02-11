import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

describe('usePullToRefresh', () => {
  const mockOnRefresh = vi.fn().mockResolvedValue(undefined);
  const mockHaptic = { impact: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state with pullDistance 0 and refreshing false', () => {
    const { result } = renderHook(() => usePullToRefresh(mockOnRefresh, mockHaptic));

    expect(result.current.pullDistance).toBe(0);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.pullThreshold).toBe(60);
  });

  it('returns defined touch handlers', () => {
    const { result } = renderHook(() => usePullToRefresh(mockOnRefresh, mockHaptic));

    expect(result.current.touchHandlers.onTouchStart).toBeDefined();
    expect(result.current.touchHandlers.onTouchMove).toBeDefined();
    expect(result.current.touchHandlers.onTouchEnd).toBeDefined();
    expect(typeof result.current.touchHandlers.onTouchStart).toBe('function');
    expect(typeof result.current.touchHandlers.onTouchMove).toBe('function');
    expect(typeof result.current.touchHandlers.onTouchEnd).toBe('function');
  });

  it('returns a containerRef', () => {
    const { result } = renderHook(() => usePullToRefresh(mockOnRefresh, mockHaptic));

    expect(result.current.containerRef).toBeDefined();
    expect(result.current.containerRef.current).toBeNull();
  });

  it('works without haptic parameter', () => {
    const { result } = renderHook(() => usePullToRefresh(mockOnRefresh));

    expect(result.current.pullDistance).toBe(0);
    expect(result.current.refreshing).toBe(false);
  });
});
