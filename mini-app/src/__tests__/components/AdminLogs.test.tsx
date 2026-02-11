import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock framer-motion (not directly used, but may be imported transitively)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock adminClient
vi.mock('@/api/adminClient', () => ({
  API_BASE_URL: 'http://localhost:3000/api',
}));

import { AdminLogs } from '@/components/AdminLogs';

const mockLogs = [
  {
    timestamp: '2026-01-15T10:30:00Z',
    level: 'info' as const,
    source: 'quest-engine',
    message: 'Quest reset completed for 42 users',
  },
  {
    timestamp: '2026-01-15T10:25:00Z',
    level: 'error' as const,
    source: 'notifications',
    message: 'Failed to send reminder to user 999',
  },
  {
    timestamp: '2026-01-15T10:20:00Z',
    level: 'info' as const,
    source: 'streak-check',
    message: 'Streak check completed',
  },
];

describe('AdminLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders log entries with levels and sources', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockLogs }),
    } as Response);

    render(<AdminLogs credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText('Quest reset completed for 42 users')).toBeInTheDocument();
      expect(screen.getByText('Failed to send reminder to user 999')).toBeInTheDocument();
      expect(screen.getByText('Streak check completed')).toBeInTheDocument();
    });

    // Check level badges
    expect(screen.getAllByText('INFO')).toHaveLength(2);
    expect(screen.getByText('ERROR')).toBeInTheDocument();

    // Check sources
    expect(screen.getByText('quest-engine')).toBeInTheDocument();
    expect(screen.getByText('notifications')).toBeInTheDocument();
  });

  it('shows log count in header', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: mockLogs }),
    } as Response);

    render(<AdminLogs credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText(/System Logs \(3\)/)).toBeInTheDocument();
    });
  });

  it('handles empty logs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: [] }),
    } as Response);

    render(<AdminLogs credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText('No log entries found')).toBeInTheDocument();
    });
  });

  it('auto-refresh toggles interval for periodic fetching', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ logs: mockLogs }),
    } as Response);

    render(<AdminLogs credentials="dGVzdDp0ZXN0" />);

    // Wait for initial render to complete
    await waitFor(() => {
      expect(screen.getByText('quest-engine')).toBeInTheDocument();
    });

    // Initial fetch count
    const initialCalls = fetchSpy.mock.calls.length;

    // Click auto-refresh toggle (button with "Auto" text)
    fireEvent.click(screen.getByText('Auto'));

    // Advance 30 seconds — should trigger a refresh
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(fetchSpy.mock.calls.length).toBeGreaterThan(initialCalls);

    vi.useRealTimers();
  });
});
