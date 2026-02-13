/**
 * Tests for usePayment hook (mini-app/src/hooks/usePayment.ts)
 *
 * Tests Stars payment flow: initiate payment, openInvoice callbacks,
 * loading state, error handling, and status polling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mock logger ────────────────────────────────────────────────────

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Mock payments API client ───────────────────────────────────────

vi.mock('@/api/payments', () => ({
  createPayment: vi.fn(),
  getPaymentStatus: vi.fn(),
  getPaymentHistory: vi.fn(),
}));

// ─── Mock @twa-dev/sdk ──────────────────────────────────────────────

vi.mock('@twa-dev/sdk', () => ({
  default: {
    openInvoice: vi.fn(),
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
  },
}));

// ─── Imports after mocks ────────────────────────────────────────────

import { createPayment, getPaymentStatus } from '@/api/payments';
import WebApp from '@twa-dev/sdk';
import { usePayment } from '@/hooks/usePayment';

const mockCreatePayment = vi.mocked(createPayment);
const mockGetPaymentStatus = vi.mocked(getPaymentStatus);
const mockOpenInvoice = vi.mocked(WebApp.openInvoice);

// ─── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Helper: advance fake timers + flush microtasks for polling */
async function flushPolling() {
  // The hook polls with setTimeout(1500) — advance past it
  await vi.advanceTimersByTimeAsync(2000);
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('usePayment', () => {
  it('starts with isLoading=false and no error', () => {
    const { result } = renderHook(() => usePayment({ userId: 42 }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeFalsy();
    expect(result.current.paymentResult).toBeFalsy();
  });

  it('initiatePayment calls createPayment API with correct params', async () => {
    mockCreatePayment.mockResolvedValue({
      payment_id: 100,
      status: 'pending',
    } as any);
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      callback?.('paid');
    });
    mockGetPaymentStatus.mockResolvedValue({
      tier: 'premium',
      is_active: true,
    } as any);

    const { result } = renderHook(() => usePayment({ userId: 42 }));

    // Start the payment flow (don't await — it has polling delays)
    let done = false;
    act(() => {
      result.current.initiatePayment('premium', 599).then(() => { done = true; });
    });

    // Flush the polling timer
    await act(async () => {
      await flushPolling();
    });

    expect(mockCreatePayment).toHaveBeenCalledWith(42, 'premium', 599);
  });

  it('opens Telegram invoice with the URL from API', async () => {
    mockCreatePayment.mockResolvedValue({
      payment_id: 10,
      status: 'pending',
    } as any);
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      callback?.('paid');
    });
    mockGetPaymentStatus.mockResolvedValue({
      tier: 'premium',
      is_active: true,
    } as any);

    const { result } = renderHook(() => usePayment({ userId: 42 }));

    act(() => {
      result.current.initiatePayment('premium', 599);
    });

    await act(async () => {
      await flushPolling();
    });

    // Hook constructs URL from payment_id + VITE_BOT_USERNAME (fallback: yakutsa_bot)
    expect(mockOpenInvoice).toHaveBeenCalledWith(
      expect.stringContaining('pay_10'),
      expect.any(Function),
    );
  });

  it('sets isLoading=true during payment flow', async () => {
    let resolveCreate: (value: any) => void;
    mockCreatePayment.mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );

    const { result } = renderHook(() => usePayment({ userId: 42 }));

    // Start payment (don't await)
    act(() => {
      result.current.initiatePayment('premium', 599);
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the API call with cancelled flow (no polling needed)
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      callback?.('cancelled');
    });

    await act(async () => {
      resolveCreate!({ payment_id: 1, status: 'pending' });
      // Flush microtasks
      await vi.advanceTimersByTimeAsync(0);
    });

    // Should no longer be loading
    expect(result.current.isLoading).toBe(false);
  });

  it('handles "cancelled" status from openInvoice', async () => {
    mockCreatePayment.mockResolvedValue({
      payment_id: 5,
      status: 'pending',
    } as any);
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      callback?.('cancelled');
    });

    const { result } = renderHook(() => usePayment({ userId: 42 }));

    await act(async () => {
      await result.current.initiatePayment('premium', 599);
    });

    // Should not poll for status on cancel
    expect(mockGetPaymentStatus).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles "failed" status from openInvoice', async () => {
    mockCreatePayment.mockResolvedValue({
      payment_id: 7,
      status: 'pending',
    } as any);
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      callback?.('failed');
    });

    const { result } = renderHook(() => usePayment({ userId: 42 }));

    await act(async () => {
      await result.current.initiatePayment('premium', 599);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles API error in createPayment', async () => {
    mockCreatePayment.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePayment({ userId: 42 }));

    await act(async () => {
      await result.current.initiatePayment('premium', 599);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
    expect(mockOpenInvoice).not.toHaveBeenCalled();
  });
});
