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
      invoice_url: 'https://t.me/$invoice_100',
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

  it('opens Telegram invoice with the URL from API response', async () => {
    mockCreatePayment.mockResolvedValue({
      payment_id: 10,
      status: 'pending',
      invoice_url: 'https://t.me/$stars_invoice_10',
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

    // Hook uses invoice_url from API response (not a constructed URL)
    expect(mockOpenInvoice).toHaveBeenCalledWith(
      'https://t.me/$stars_invoice_10',
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
      resolveCreate!({ payment_id: 1, status: 'pending', invoice_url: 'https://t.me/$invoice_1' });
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
      invoice_url: 'https://t.me/$invoice_5',
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
      invoice_url: 'https://t.me/$invoice_7',
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

// ─── Tests: Invoice URL from API response (Run 60) ─────────────────
// Agent B modifies usePayment to use invoice_url from createPayment response
// instead of constructing a fake URL from payment_id.

describe('usePayment — invoice URL from API', () => {
  it('should use invoice_url from createPayment response for openInvoice', async () => {
    const realInvoiceUrl = 'https://t.me/$premium_invoice_abc123';

    mockCreatePayment.mockResolvedValue({
      payment_id: 200,
      status: 'pending',
      invoice_url: realInvoiceUrl,
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

    // openInvoice should be called with the exact URL from the API, not a constructed one
    expect(mockOpenInvoice).toHaveBeenCalledWith(
      realInvoiceUrl,
      expect.any(Function),
    );
  });

  it('should not construct URL from payment_id when invoice_url is provided', async () => {
    const apiInvoiceUrl = 'https://t.me/$stars_invoice_xyz';

    mockCreatePayment.mockResolvedValue({
      payment_id: 300,
      status: 'pending',
      invoice_url: apiInvoiceUrl,
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

    // Should NOT contain the old constructed pattern (pay_300 or startattach)
    const invoiceUrlArg = mockOpenInvoice.mock.calls[0][0];
    expect(invoiceUrlArg).toBe(apiInvoiceUrl);
    expect(invoiceUrlArg).not.toContain('startattach');
    expect(invoiceUrlArg).not.toContain('pay_300');
  });

  it('should complete full payment flow with API-provided invoice URL', async () => {
    mockCreatePayment.mockResolvedValue({
      payment_id: 400,
      status: 'pending',
      invoice_url: 'https://t.me/$invoice_flow_test',
    } as any);
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      callback?.('paid');
    });
    mockGetPaymentStatus.mockResolvedValue({
      tier: 'premium',
      is_active: true,
    } as any);

    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePayment({ userId: 42, onSuccess }));

    act(() => {
      result.current.initiatePayment('premium', 599);
    });

    await act(async () => {
      await flushPolling();
    });

    // Payment should succeed and call onSuccess
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeFalsy();
    expect(result.current.paymentResult).toBeTruthy();
    expect(result.current.paymentResult?.tier).toBe('premium');
  });
});
