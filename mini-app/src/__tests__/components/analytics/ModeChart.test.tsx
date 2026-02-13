import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

import { ProgressRing, WeeklyXpChart, QuestHistoryList } from '@/components/analytics/ModeChart';
import type { WeeklyXpItem, QuestHistoryItem } from '@/components/analytics/useModeAnalytics';

describe('ProgressRing', () => {
  it('renders an SVG element', () => {
    const { container } = render(<ProgressRing percent={75} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders two circle elements (background + progress)', () => {
    const { container } = render(<ProgressRing percent={50} />);
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
  });

  it('accepts custom size prop', () => {
    const { container } = render(<ProgressRing percent={50} size={80} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('80');
    expect(svg?.getAttribute('height')).toBe('80');
  });
});

describe('WeeklyXpChart', () => {
  const mockData: WeeklyXpItem[] = [
    { day: '2026-02-10', xp: 100 },
    { day: '2026-02-11', xp: 150 },
    { day: '2026-02-12', xp: 0 },
  ];

  it('renders XP values for each day', () => {
    render(<WeeklyXpChart data={mockData} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders one bar per data item', () => {
    const { container } = render(<WeeklyXpChart data={mockData} />);
    // Each item renders a column wrapper with flex-1
    const columns = container.querySelectorAll('.flex-1');
    expect(columns).toHaveLength(3);
  });
});

describe('QuestHistoryList', () => {
  const mockQuests: QuestHistoryItem[] = [
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
    {
      id: 2,
      title: 'Evening Run',
      type: 'daily',
      difficulty: 'hard',
      status: 'failed',
      xp_awarded: 0,
      date: '2026-02-09',
      completed_at: null,
      check_ins: 1,
      target: 3,
    },
  ];

  it('renders quest titles', () => {
    render(<QuestHistoryList quests={mockQuests} />);
    expect(screen.getByText('Morning Workout')).toBeInTheDocument();
    expect(screen.getByText('Evening Run')).toBeInTheDocument();
  });

  it('shows XP for completed quests', () => {
    render(<QuestHistoryList quests={mockQuests} />);
    expect(screen.getByText('+50 XP')).toBeInTheDocument();
  });

  it('does not show XP badge for zero XP quests', () => {
    render(<QuestHistoryList quests={mockQuests} />);
    expect(screen.queryByText('+0 XP')).not.toBeInTheDocument();
  });

  it('renders status badges', () => {
    render(<QuestHistoryList quests={mockQuests} />);
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('shows check-in counts', () => {
    render(<QuestHistoryList quests={mockQuests} />);
    expect(screen.getByText(/3\/3 check-ins/)).toBeInTheDocument();
    expect(screen.getByText(/1\/3 check-ins/)).toBeInTheDocument();
  });

  it('limits display to 10 quests', () => {
    const manyQuests = Array.from({ length: 15 }, (_, i) => ({
      ...mockQuests[0],
      id: i + 1,
      title: `Quest ${i + 1}`,
    }));
    render(<QuestHistoryList quests={manyQuests} />);
    expect(screen.getByText('Quest 1')).toBeInTheDocument();
    expect(screen.getByText('Quest 10')).toBeInTheDocument();
    expect(screen.queryByText('Quest 11')).not.toBeInTheDocument();
  });
});
