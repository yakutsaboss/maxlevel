import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Toast component
vi.mock('@/components/Toast', () => ({
  Toast: ({ message, variant }: { message: string; variant: string }) => (
    <div data-testid="toast" data-variant={variant}>{message}</div>
  ),
}));

// Mock adminClient
vi.mock('@/api/adminClient', () => ({
  API_BASE_URL: 'http://localhost:3000/api',
}));

import { AdminJobs } from '@/components/AdminJobs';

const mockJobs = [
  { name: 'daily-quest-reset', cron: '0 0 * * *' },
  { name: 'streak-check', cron: '0 */6 * * *' },
  { name: 'xp-decay', cron: '0 9 * * *' },
];

describe('AdminJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders job list with names and schedules', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: mockJobs }),
    } as Response);

    render(<AdminJobs credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText('daily-quest-reset')).toBeInTheDocument();
      expect(screen.getByText('streak-check')).toBeInTheDocument();
      expect(screen.getByText('xp-decay')).toBeInTheDocument();
    });

    // Check formatted cron descriptions
    expect(screen.getByText('Daily at midnight')).toBeInTheDocument();
    expect(screen.getByText('Every 6 hours')).toBeInTheDocument();
    expect(screen.getByText('Daily at 9:00')).toBeInTheDocument();
  });

  it('shows job count in header', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: mockJobs }),
    } as Response);

    render(<AdminJobs credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText(/Background Jobs \(3\)/)).toBeInTheDocument();
    });
  });

  it('trigger button calls API and shows success toast', async () => {
    // First call: fetch jobs
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: mockJobs }),
      } as Response)
      // Second call: trigger job
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Job "daily-quest-reset" triggered' }),
      } as Response);

    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AdminJobs credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText('daily-quest-reset')).toBeInTheDocument();
    });

    // Click the first trigger button
    const triggerButtons = screen.getAllByText('Trigger');
    fireEvent.click(triggerButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'success');
    });
  });

  it('shows error toast when trigger fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: mockJobs }),
      } as Response)
      .mockRejectedValueOnce(new Error('Connection failed'));

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AdminJobs credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText('daily-quest-reset')).toBeInTheDocument();
    });

    const triggerButtons = screen.getAllByText('Trigger');
    fireEvent.click(triggerButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'error');
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });
});
