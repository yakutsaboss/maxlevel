import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestList } from '@/components/admin/quest-editor/QuestList';
import type { QuestTemplate } from '@/components/admin/quest-editor/types';

vi.mock('lucide-react', () => ({
  Pencil: (props: any) => <span data-testid="pencil-icon" {...props} />,
  Trash2: (props: any) => <span data-testid="trash-icon" {...props} />,
  Clock: (props: any) => <span data-testid="clock-icon" {...props} />,
}));

const mockQuests: QuestTemplate[] = [
  {
    id: 1,
    mode_id: 1,
    title: 'Morning Workout',
    description: 'Do 30 mins of exercise',
    quest_type: 'daily',
    xp_reward: 50,
    difficulty: 'medium',
    requires_timer: false,
    timer_window_start: null,
    timer_window_end: null,
    readiness_check_enabled: false,
    readiness_check_time: null,
    is_mandatory: false,
    mode_name: 'fitness',
    mode_display_name: 'Fitness',
    mode_icon: '\u{1F3CB}\u{FE0F}',
  },
  {
    id: 2,
    mode_id: 2,
    title: 'Drink Water',
    description: null,
    quest_type: 'weekly',
    xp_reward: 25,
    difficulty: 'easy',
    requires_timer: true,
    timer_window_start: '08:00:00',
    timer_window_end: '20:00:00',
    readiness_check_enabled: false,
    readiness_check_time: null,
    is_mandatory: false,
    mode_name: 'hydration',
    mode_display_name: 'Hydration',
    mode_icon: '\u{1F4A7}',
  },
];

describe('QuestList', () => {
  const defaultProps = {
    quests: mockQuests,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no quests', () => {
    render(<QuestList quests={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('No quest templates yet')).toBeInTheDocument();
  });

  it('renders quest titles', () => {
    render(<QuestList {...defaultProps} />);
    expect(screen.getByText('Morning Workout')).toBeInTheDocument();
    expect(screen.getByText('Drink Water')).toBeInTheDocument();
  });

  it('renders one QuestPreview per quest', () => {
    render(<QuestList {...defaultProps} />);
    // Each quest gets edit + delete icons
    const pencilIcons = screen.getAllByTestId('pencil-icon');
    expect(pencilIcons).toHaveLength(2);
  });
});
