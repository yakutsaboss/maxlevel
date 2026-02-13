import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestPreview } from '@/components/admin/quest-editor/QuestPreview';
import type { QuestTemplate } from '@/components/admin/quest-editor/types';

vi.mock('lucide-react', () => ({
  Pencil: (props: any) => <span data-testid="pencil-icon" {...props} />,
  Trash2: (props: any) => <span data-testid="trash-icon" {...props} />,
  Clock: (props: any) => <span data-testid="clock-icon" {...props} />,
}));

const baseQuest: QuestTemplate = {
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
};

describe('QuestPreview', () => {
  const defaultProps = {
    quest: baseQuest,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quest title', () => {
    render(<QuestPreview {...defaultProps} />);
    expect(screen.getByText('Morning Workout')).toBeInTheDocument();
  });

  it('renders quest description when present', () => {
    render(<QuestPreview {...defaultProps} />);
    expect(screen.getByText('Do 30 mins of exercise')).toBeInTheDocument();
  });

  it('does not render description when null', () => {
    render(<QuestPreview {...defaultProps} quest={{ ...baseQuest, description: null }} />);
    expect(screen.queryByText('Do 30 mins of exercise')).not.toBeInTheDocument();
  });

  it('renders quest type badge', () => {
    render(<QuestPreview {...defaultProps} />);
    expect(screen.getByText('daily')).toBeInTheDocument();
  });

  it('renders difficulty badge', () => {
    render(<QuestPreview {...defaultProps} />);
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('renders XP reward', () => {
    render(<QuestPreview {...defaultProps} />);
    expect(screen.getByText('50 XP')).toBeInTheDocument();
  });

  it('renders mode badge with icon and name', () => {
    render(<QuestPreview {...defaultProps} />);
    expect(screen.getByText(/Fitness/)).toBeInTheDocument();
  });

  it('shows timer badge when requires_timer is true', () => {
    const timerQuest: QuestTemplate = {
      ...baseQuest,
      requires_timer: true,
      timer_window_start: '08:00:00',
      timer_window_end: '20:00:00',
    };
    render(<QuestPreview {...defaultProps} quest={timerQuest} />);
    expect(screen.getByText('08:00\u201320:00')).toBeInTheDocument();
  });

  it('does not show timer badge when requires_timer is false', () => {
    render(<QuestPreview {...defaultProps} />);
    expect(screen.queryByTestId('clock-icon')).not.toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    render(<QuestPreview {...defaultProps} />);
    fireEvent.click(screen.getByTestId('pencil-icon'));
    expect(defaultProps.onEdit).toHaveBeenCalledWith(baseQuest);
  });

  it('calls onDelete when delete button clicked', () => {
    render(<QuestPreview {...defaultProps} />);
    fireEvent.click(screen.getByTestId('trash-icon'));
    expect(defaultProps.onDelete).toHaveBeenCalledWith(baseQuest);
  });
});
