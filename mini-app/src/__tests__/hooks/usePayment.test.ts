/**
 * Tests for usePayment hook (mini-app/src/hooks/usePayment.ts)
 *
 * Tests Stars payment flow: initiate payment, openInvoice callbacks,
 * loading state, error handling, and status polling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

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
});

// ─── Tests ──────────────────────────────────────────────────────────

describe('usePayment', () => {
  it('starts with isLoading=false and no error', () => {
    const { result } = renderHook(() => usePayment());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeFalsy();
    expect(result.current.paymentResult).toBeFalsy();
  });

  it('initiatePayment calls createPayment API with correct params', async () => {
    mockCreatePayment.mockResolvedValue({
      invoiceUrl: 'https://t.me/$invoice123',
      paymentId: 42,
    } as any);
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      // Simulate user paying
      callback?.('paid');
    });
    mockGetPaymentStatus.mockResolvedValue({
      status: 'completed',
      tier: 'premium',
    } as any);

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.initiatePayment(1, 'premium', 599);
    });

    expect(mockCreatePayment).toHaveBeenCalledWith(1, 'premium', 599);
  });

  it('opens Telegram invoice with the URL from API', async () => {
    mockCreatePayment.mockResolvedValue({
      invoiceUrl: 'https://t.me/$invoice456',
      paymentId: 10,
    } as any);
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      callback?.('paid');
    });
    mockGetPaymentStatus.mockResolvedValue({
      status: 'completed',
      tier: 'premium',
    } as any);

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.initiatePayment(1, 'premium', 599);
    });

    expect(mockOpenInvoice).toHaveBeenCalledWith(
      'https://t.me/$invoice456',
      expect.any(Function),
    );
  });

  it('sets isLoading=true during payment flow', async () => {
    let resolveCreate: (value: any) => void;
    mockCreatePayment.mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );

    const { result } = renderHook(() => usePayment());

    // Start payment (don't await)
    let paymentPromise: Promise<void>;
    act(() => {
      paymentPromise = result.current.initiatePayment(1, 'premium', 599);
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the API call
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      callback?.('cancelled');
    });

    await act(async () => {
      resolveCreate!({ invoiceUrl: 'https://t.me/$test', paymentId: 1 });
      await paymentPromise!;
    });

    // Should no longer be loading
    expect(result.current.isLoading).toBe(false);
  });

  it('handles "cancelled" status from openInvoice', async () => {
    mockCreatePayment.mockResolvedValue({
      invoiceUrl: 'https://t.me/$invoice789',
      paymentId: 5,
    } as any);
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      callback?.('cancelled');
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.initiatePayment(1, 'premium', 599);
    });

    // Should not poll for status on cancel
    expect(mockGetPaymentStatus).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles "failed" status from openInvoice', async () => {
    mockCreatePayment.mockResolvedValue({
      invoiceUrl: 'https://t.me/$invoiceFail',
      paymentId: 7,
    } as any);
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      callback?.('failed');
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.initiatePayment(1, 'premium', 599);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles API error in createPayment', async () => {
    mockCreatePayment.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.initiatePayment(1, 'premium', 599);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
    expect(mockOpenInvoice).not.toHaveBeenCalled();
  });

  it('clears error on new payment attempt', async () => {
    // First attempt fails
    mockCreatePayment.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.initiatePayment(1, 'premium', 599);
    });

    expect(result.current.error).toBeTruthy();

    // Second attempt — error should be cleared at start
    mockCreatePayment.mockResolvedValueOnce({
      invoiceUrl: 'https://t.me/$retry',
      paymentId: 2,
    } as any);
    mockOpenInvoice.mockImplementation((_url: string, callback?: (status: string) => void) => {
      callback?.('paid');
    });
    mockGetPaymentStatus.mockResolvedValueOnce({
      status: 'completed',
      tier: 'premium',
    } as any);

    await act(async () => {
      await result.current.initiatePayment(1, 'premium', 599);
    });

    expect(result.current.error).toBeFalsy();
  });
});
