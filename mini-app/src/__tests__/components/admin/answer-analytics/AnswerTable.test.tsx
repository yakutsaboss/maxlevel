import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  BarChart3: (props: any) => <span data-testid="bar-chart-icon" {...props} />,
  Users: (props: any) => <span data-testid="users-icon" {...props} />,
  ChevronDown: (props: any) => <span data-testid="chevron-down-icon" {...props} />,
}));

vi.mock('@/components/admin/answer-analytics/useAnswerAnalytics', async () => {
  const actual = await vi.importActual<typeof import('@/components/admin/answer-analytics/useAnswerAnalytics')>(
    '@/components/admin/answer-analytics/useAnswerAnalytics'
  );
  return actual;
});

import { AnswerTable } from '@/components/admin/answer-analytics/AnswerTable';
import type { ModeAnalyticsData } from '@/components/admin/answer-analytics/useAnswerAnalytics';

const mockMode: ModeAnalyticsData = {
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
      responses: { '3': 18, '5': 12 },
      most_common: '3',
    },
  ],
};

describe('AnswerTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when currentMode is undefined', () => {
    render(
      <AnswerTable currentMode={undefined} expandedQ={null} onToggleQuestion={vi.fn()} />
    );
    expect(screen.getByText('No analytics data for this mode')).toBeInTheDocument();
  });

  it('renders respondent count', () => {
    render(
      <AnswerTable currentMode={mockMode} expandedQ={null} onToggleQuestion={vi.fn()} />
    );
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders respondents label with mode info', () => {
    render(
      <AnswerTable currentMode={mockMode} expandedQ={null} onToggleQuestion={vi.fn()} />
    );
    expect(screen.getByText(/Fitness respondents/)).toBeInTheDocument();
  });

  it('renders all question charts', () => {
    render(
      <AnswerTable currentMode={mockMode} expandedQ={null} onToggleQuestion={vi.fn()} />
    );
    expect(screen.getByText('Fitness Level')).toBeInTheDocument();
    expect(screen.getByText('Workout Frequency')).toBeInTheDocument();
  });

  it('shows "No response data yet" when questions array is empty', () => {
    const emptyMode: ModeAnalyticsData = { ...mockMode, questions: [] };
    render(
      <AnswerTable currentMode={emptyMode} expandedQ={null} onToggleQuestion={vi.fn()} />
    );
    expect(screen.getByText('No response data yet')).toBeInTheDocument();
  });
});
