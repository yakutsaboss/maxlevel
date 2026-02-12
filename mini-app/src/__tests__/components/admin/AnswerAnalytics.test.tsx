import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  BarChart3: (props: any) => <span data-testid="bar-chart-icon" {...props} />,
  Users: (props: any) => <span data-testid="users-icon" {...props} />,
  RefreshCw: (props: any) => <span data-testid="refresh-icon" {...props} />,
  ChevronDown: (props: any) => <span data-testid="chevron-down-icon" {...props} />,
}));

const mockAdminFetch = vi.fn();
vi.mock('@/api/adminClient', () => ({
  adminFetch: (...args: unknown[]) => mockAdminFetch(...args),
}));

import { AnswerAnalytics } from '@/components/admin/AnswerAnalytics';

const mockAnalyticsData = {
  data: {
    modes: [
      {
        mode_id: 1,
        mode_name: 'fitness',
        display_name: 'Fitness',
        icon: '\u{1F3CB}\u{FE0F}',
        respondent_count: 42,
        questions: [
          {
            key: 'fitness_level',
            label: 'Fitness Level',
            responses: { beginner: 20, intermediate: 15, advanced: 5, expert: 2 },
            most_common: 'beginner',
          },
          {
            key: 'workout_frequency',
            label: 'Workout Frequency',
            responses: { '3': 18, '5': 12, '7': 8, '2': 4 },
            most_common: '3',
          },
        ],
      },
      {
        mode_id: 2,
        mode_name: 'hydration',
        display_name: 'Hydration',
        icon: '\u{1F4A7}',
        respondent_count: 30,
        questions: [
          {
            key: 'current_intake',
            label: 'Current Intake',
            responses: { low: 10, average: 12, good: 8 },
            most_common: 'average',
          },
        ],
      },
    ],
  },
};

describe('AnswerAnalytics', () => {
  const defaultProps = { credentials: 'dGVzdA==' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton initially', () => {
    mockAdminFetch.mockReturnValue(new Promise(() => {}));

    render(<AnswerAnalytics {...defaultProps} />);

    expect(screen.getByText('Answer Analytics')).toBeInTheDocument();
    // Skeleton placeholders are rendered
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons.length).toBe(3);
  });

  it('shows error state with retry button', async () => {
    mockAdminFetch.mockRejectedValue(new Error('Connection failed'));

    render(<AnswerAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to connect to server')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows error from server response', async () => {
    mockAdminFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' }),
    });

    render(<AnswerAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
    });
  });

  it('renders mode tabs and data after loading', async () => {
    mockAdminFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsData),
    });

    render(<AnswerAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Fitness')).toBeInTheDocument();
    });

    // Mode tabs are rendered
    expect(screen.getByText('Hydration')).toBeInTheDocument();

    // Default mode is fitness, respondent count shown
    expect(screen.getByText('42')).toBeInTheDocument();

    // Questions are shown
    expect(screen.getByText('Fitness Level')).toBeInTheDocument();
    expect(screen.getByText('Workout Frequency')).toBeInTheDocument();
  });

  it('switches mode tab on click', async () => {
    mockAdminFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsData),
    });

    render(<AnswerAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Fitness')).toBeInTheDocument();
    });

    // Click Hydration tab
    fireEvent.click(screen.getByText('Hydration'));

    await waitFor(() => {
      expect(screen.getByText('30')).toBeInTheDocument(); // hydration respondent count
    });

    expect(screen.getByText('Current Intake')).toBeInTheDocument();
  });

  it('shows "no analytics data" for mode with no data', async () => {
    mockAdminFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsData),
    });

    render(<AnswerAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Fitness')).toBeInTheDocument();
    });

    // Medication tab has no data in our mock
    fireEvent.click(screen.getByText('Medication'));

    expect(screen.getByText('No analytics data for this mode')).toBeInTheDocument();
  });

  it('calls adminFetch with correct credentials', async () => {
    mockAdminFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsData),
    });

    render(<AnswerAnalytics credentials="YWRtaW46cGFzcw==" />);

    await waitFor(() => {
      expect(mockAdminFetch).toHaveBeenCalledWith('/analytics', 'YWRtaW46cGFzcw==');
    });
  });

  it('retries fetch on retry button click', async () => {
    mockAdminFetch.mockRejectedValueOnce(new Error('fail'));

    render(<AnswerAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    mockAdminFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsData),
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Fitness Level')).toBeInTheDocument();
    });

    expect(mockAdminFetch).toHaveBeenCalledTimes(2);
  });
});
