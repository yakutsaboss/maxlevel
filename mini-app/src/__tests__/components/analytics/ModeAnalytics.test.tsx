import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  BarChart3: (props: any) => <span data-testid="bar-chart-icon" {...props} />,
  Flame: (props: any) => <span data-testid="flame-icon" {...props} />,
  Trophy: (props: any) => <span data-testid="trophy-icon" {...props} />,
  Target: (props: any) => <span data-testid="target-icon" {...props} />,
  ChevronRight: (props: any) => <span data-testid="chevron-right-icon" {...props} />,
  Loader2: (props: any) => <span data-testid="loader-icon" {...props} />,
  AlertCircle: (props: any) => <span data-testid="alert-icon" {...props} />,
}));

import { ModeAnalytics } from '@/components/analytics/ModeAnalytics';

const mockModesResponse = {
  data: [
    {
      mode_id: 1,
      mode_name: 'fitness',
      display_name: 'Fitness',
      icon: '\u{1F3CB}\u{FE0F}',
      completion_rate: 75,
      total_quests: 20,
      completed_quests: 15,
      xp_earned: 1200,
      streak: { current: 5, longest: 12 },
    },
    {
      mode_id: 2,
      mode_name: 'hydration',
      display_name: 'Hydration',
      icon: '\u{1F4A7}',
      completion_rate: 90,
      total_quests: 30,
      completed_quests: 27,
      xp_earned: 800,
      streak: { current: 0, longest: 7 },
    },
  ],
};

const mockDetailResponse = {
  data: {
    mode: { id: 1, name: 'fitness', display_name: 'Fitness', icon: '\u{1F3CB}\u{FE0F}' },
    progress: { completion_rate: 75, total_quests: 20, completed_quests: 15 },
    streak: { current: 5, longest: 12, last_activity: '2026-02-10' },
    weekly_xp: [
      { day: '2026-02-06', xp: 100 },
      { day: '2026-02-07', xp: 150 },
    ],
    quest_history: [
      {
        id: 1,
        title: 'Morning Workout',
        type: 'daily',
        difficulty: 'medium',
        status: 'completed',
        xp_awarded: 50,
        date: '2026-02-10',
        completed_at: '2026-02-10T08:30:00Z',
        check_ins: 3,
        target: 3,
      },
    ],
  },
};

describe('ModeAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));

    render(<ModeAnalytics userId={1} />);

    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('renders mode list after successful fetch', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockModesResponse),
    } as Response);

    render(<ModeAnalytics userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Mode Analytics')).toBeInTheDocument();
    });

    expect(screen.getByText('Fitness')).toBeInTheDocument();
    expect(screen.getByText('Hydration')).toBeInTheDocument();
    expect(screen.getByText('75% complete')).toBeInTheDocument();
    expect(screen.getByText('1200 XP')).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<ModeAnalytics userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows error on non-ok HTTP response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    render(<ModeAnalytics userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('HTTP 500')).toBeInTheDocument();
    });
  });

  it('shows empty state when no modes returned', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    render(<ModeAnalytics userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('No active modes found')).toBeInTheDocument();
    });
  });

  it('navigates to detail view on mode click', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    // First call: modes list
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockModesResponse),
    } as Response);

    render(<ModeAnalytics userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Fitness')).toBeInTheDocument();
    });

    // Second call: mode detail
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDetailResponse),
    } as Response);

    fireEvent.click(screen.getByRole('button', { name: /Fitness: 75% complete/ }));

    await waitFor(() => {
      expect(screen.getByText('Detailed progress analytics')).toBeInTheDocument();
    });

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // current streak
    expect(screen.getByText('12')).toBeInTheDocument(); // longest streak
    expect(screen.getByText('Morning Workout')).toBeInTheDocument();
    expect(screen.getByText('Weekly XP')).toBeInTheDocument();
  });

  it('handles back button from detail view', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    // First: modes list
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockModesResponse),
    } as Response);

    render(<ModeAnalytics userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Fitness')).toBeInTheDocument();
    });

    // Navigate to detail
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDetailResponse),
    } as Response);

    fireEvent.click(screen.getByRole('button', { name: /Fitness: 75% complete/ }));

    await waitFor(() => {
      expect(screen.getByText('Back to all modes')).toBeInTheDocument();
    });

    // Go back — modes list is fetched again
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockModesResponse),
    } as Response);

    fireEvent.click(screen.getByText('Back to all modes'));

    await waitFor(() => {
      expect(screen.getByText('Mode Analytics')).toBeInTheDocument();
    });
  });

  it('shows streak badge only when current streak > 0', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockModesResponse),
    } as Response);

    render(<ModeAnalytics userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Fitness')).toBeInTheDocument();
    });

    // Fitness has streak.current = 5, should show fire emoji
    expect(screen.getByText(/5d/)).toBeInTheDocument();
    // Hydration has streak.current = 0, should NOT show fire emoji for it
  });
});
