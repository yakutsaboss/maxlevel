import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  ChevronDown: (props: any) => <span data-testid="chevron-down-icon" {...props} />,
}));

vi.mock('@/components/admin/answer-analytics/useAnswerAnalytics', async () => {
  const actual = await vi.importActual<typeof import('@/components/admin/answer-analytics/useAnswerAnalytics')>(
    '@/components/admin/answer-analytics/useAnswerAnalytics'
  );
  return actual;
});

import { AnswerChart } from '@/components/admin/answer-analytics/AnswerChart';
import type { QuestionStat } from '@/components/admin/answer-analytics/useAnswerAnalytics';

const fewResponsesQuestion: QuestionStat = {
  key: 'fitness_level',
  label: 'Fitness Level',
  responses: { beginner: 20, intermediate: 15, advanced: 5 },
  most_common: 'beginner',
};

const manyResponsesQuestion: QuestionStat = {
  key: 'workout_frequency',
  label: '',
  responses: { '1': 5, '2': 10, '3': 18, '4': 8, '5': 12, '6': 3, '7': 2 },
  most_common: '3',
};

describe('AnswerChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders question label', () => {
    render(
      <AnswerChart question={fewResponsesQuestion} isExpanded={false} onToggle={vi.fn()} />
    );
    expect(screen.getByText('Fitness Level')).toBeInTheDocument();
  });

  it('falls back to formatted key when label is empty', () => {
    render(
      <AnswerChart question={manyResponsesQuestion} isExpanded={false} onToggle={vi.fn()} />
    );
    // formatLabel('workout_frequency') => 'Workout Frequency'
    expect(screen.getByText('Workout Frequency')).toBeInTheDocument();
  });

  it('shows total answer count', () => {
    render(
      <AnswerChart question={fewResponsesQuestion} isExpanded={false} onToggle={vi.fn()} />
    );
    // 20 + 15 + 5 = 40
    expect(screen.getByText('40 answers')).toBeInTheDocument();
  });

  it('shows most common answer in the highlight', () => {
    render(
      <AnswerChart question={fewResponsesQuestion} isExpanded={false} onToggle={vi.fn()} />
    );
    // The "Most common:" line contains the formatted label
    expect(screen.getByText(/Most common:/)).toBeInTheDocument();
    const highlight = screen.getByText(/Most common:/).closest('div');
    expect(highlight?.textContent).toContain('Beginner');
  });

  it('does not show "Show all" button when 4 or fewer entries', () => {
    render(
      <AnswerChart question={fewResponsesQuestion} isExpanded={false} onToggle={vi.fn()} />
    );
    expect(screen.queryByText(/Show all/)).not.toBeInTheDocument();
  });

  it('shows "Show all N options" button when more than 4 entries', () => {
    render(
      <AnswerChart question={manyResponsesQuestion} isExpanded={false} onToggle={vi.fn()} />
    );
    expect(screen.getByText('Show all 7 options')).toBeInTheDocument();
  });

  it('shows "Show less" when expanded', () => {
    render(
      <AnswerChart question={manyResponsesQuestion} isExpanded={true} onToggle={vi.fn()} />
    );
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });

  it('calls onToggle when show more/less button clicked', () => {
    const onToggle = vi.fn();
    render(
      <AnswerChart question={manyResponsesQuestion} isExpanded={false} onToggle={onToggle} />
    );
    fireEvent.click(screen.getByText('Show all 7 options'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders percentage for each visible bar', () => {
    render(
      <AnswerChart question={fewResponsesQuestion} isExpanded={false} onToggle={vi.fn()} />
    );
    // beginner: 20/40 = 50%, intermediate: 15/40 = 38%, advanced: 5/40 = 13%
    expect(screen.getByText('20 (50%)')).toBeInTheDocument();
    expect(screen.getByText('15 (38%)')).toBeInTheDocument();
    expect(screen.getByText('5 (13%)')).toBeInTheDocument();
  });
});
