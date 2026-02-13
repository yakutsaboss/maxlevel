import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  BarChart3: (props: any) => <span data-testid="bar-chart-icon" {...props} />,
  Flame: (props: any) => <span data-testid="flame-icon" {...props} />,
  Trophy: (props: any) => <span data-testid="trophy-icon" {...props} />,
  Target: (props: any) => <span data-testid="target-icon" {...props} />,
  ChevronRight: (props: any) => <span data-testid="chevron-right-icon" {...props} />,
}));

import { ModeDetailView, ModeOverviewCard } from '@/components/analytics/ModeStatsCard';
import type { ModeAnalyticsData, ModeDetailData } from '@/components/analytics/useModeAnalytics';

const mockModeItem: ModeAnalyticsData = {
  mode_id: 1,
  mode_name: 'fitness',
  display_name: 'Fitness',
  icon: '\u{1F3CB}\u{FE0F}',
  completion_rate: 75,
  total_quests: 20,
  completed_quests: 15,
  xp_earned: 1200,
  streak: { current: 5, longest: 12 },
};

const mockDetailData: ModeDetailData = {
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
};

describe('ModeOverviewCard', () => {
  it('renders mode display name', () => {
    render(<ModeOverviewCard modeItem={mockModeItem} index={0} onSelect={vi.fn()} />);
    expect(screen.getByText('Fitness')).toBeInTheDocument();
  });

  it('renders completion rate', () => {
    render(<ModeOverviewCard modeItem={mockModeItem} index={0} onSelect={vi.fn()} />);
    expect(screen.getByText('75% complete')).toBeInTheDocument();
  });

  it('renders XP earned', () => {
    render(<ModeOverviewCard modeItem={mockModeItem} index={0} onSelect={vi.fn()} />);
    expect(screen.getByText('1200 XP')).toBeInTheDocument();
  });

  it('shows streak badge when streak > 0', () => {
    render(<ModeOverviewCard modeItem={mockModeItem} index={0} onSelect={vi.fn()} />);
    expect(screen.getByText(/5d/)).toBeInTheDocument();
  });

  it('hides streak badge when streak is 0', () => {
    const noStreakMode = { ...mockModeItem, streak: { current: 0, longest: 12 } };
    render(<ModeOverviewCard modeItem={noStreakMode} index={0} onSelect={vi.fn()} />);
    expect(screen.queryByText(/0d/)).not.toBeInTheDocument();
  });

  it('calls onSelect with mode_name when clicked', () => {
    const onSelect = vi.fn();
    render(<ModeOverviewCard modeItem={mockModeItem} index={0} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('fitness');
  });

  it('has accessible aria-label', () => {
    render(<ModeOverviewCard modeItem={mockModeItem} index={0} onSelect={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Fitness: 75% complete, 1200 XP'
    );
  });
});

describe('ModeDetailView', () => {
  it('renders mode display name', () => {
    render(<ModeDetailView detailData={mockDetailData} onBack={vi.fn()} />);
    expect(screen.getByText('Fitness')).toBeInTheDocument();
  });

  it('renders "Detailed progress analytics" subtitle', () => {
    render(<ModeDetailView detailData={mockDetailData} onBack={vi.fn()} />);
    expect(screen.getByText('Detailed progress analytics')).toBeInTheDocument();
  });

  it('renders completion rate, current streak, and best streak', () => {
    render(<ModeDetailView detailData={mockDetailData} onBack={vi.fn()} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders Weekly XP section when data exists', () => {
    render(<ModeDetailView detailData={mockDetailData} onBack={vi.fn()} />);
    expect(screen.getByText('Weekly XP')).toBeInTheDocument();
  });

  it('does not render Weekly XP section when no data', () => {
    const noXpData = { ...mockDetailData, weekly_xp: [] };
    render(<ModeDetailView detailData={noXpData} onBack={vi.fn()} />);
    expect(screen.queryByText('Weekly XP')).not.toBeInTheDocument();
  });

  it('renders quest history', () => {
    render(<ModeDetailView detailData={mockDetailData} onBack={vi.fn()} />);
    expect(screen.getByText('Recent Quests')).toBeInTheDocument();
    expect(screen.getByText('Morning Workout')).toBeInTheDocument();
  });

  it('shows "No quest history yet" when empty', () => {
    const noHistory = { ...mockDetailData, quest_history: [] };
    render(<ModeDetailView detailData={noHistory} onBack={vi.fn()} />);
    expect(screen.getByText('No quest history yet')).toBeInTheDocument();
  });

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn();
    render(<ModeDetailView detailData={mockDetailData} onBack={onBack} />);
    fireEvent.click(screen.getByText('Back to all modes'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
