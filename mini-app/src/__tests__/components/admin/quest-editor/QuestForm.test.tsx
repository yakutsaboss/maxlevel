import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestForm } from '@/components/admin/quest-editor/QuestForm';
import type { QuestFormData, ModeOption } from '@/components/admin/quest-editor/types';

vi.mock('lucide-react', () => ({
  X: (props: any) => <span data-testid="x-icon" {...props} />,
  Save: (props: any) => <span data-testid="save-icon" {...props} />,
  Timer: (props: any) => <span data-testid="timer-icon" {...props} />,
}));

const mockModes: ModeOption[] = [
  { id: 1, name: 'fitness', display_name: 'Fitness', icon_emoji: '\u{1F3CB}\u{FE0F}' },
  { id: 2, name: 'hydration', display_name: 'Hydration', icon_emoji: '\u{1F4A7}' },
];

const emptyForm: QuestFormData = {
  mode_id: null,
  title: '',
  description: '',
  quest_type: 'daily',
  xp_reward: 50,
  difficulty: 'medium',
  requires_timer: false,
  timer_window_start: '',
  timer_window_end: '',
};

describe('QuestForm', () => {
  const defaultProps = {
    form: emptyForm,
    modes: mockModes,
    editingId: null as number | null,
    saving: false,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onUpdateField: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "New Quest" heading when editingId is null', () => {
    render(<QuestForm {...defaultProps} />);
    expect(screen.getByText('New Quest')).toBeInTheDocument();
  });

  it('renders "Edit Quest" heading when editingId is set', () => {
    render(<QuestForm {...defaultProps} editingId={5} />);
    expect(screen.getByText('Edit Quest')).toBeInTheDocument();
  });

  it('renders title input with placeholder', () => {
    render(<QuestForm {...defaultProps} />);
    expect(screen.getByPlaceholderText('e.g. Morning Workout')).toBeInTheDocument();
  });

  it('calls onUpdateField when title changes', () => {
    render(<QuestForm {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Morning Workout'), {
      target: { value: 'New Quest Title' },
    });
    expect(defaultProps.onUpdateField).toHaveBeenCalledWith('title', 'New Quest Title');
  });

  it('calls onClose when X button clicked', () => {
    render(<QuestForm {...defaultProps} />);
    fireEvent.click(screen.getByTestId('x-icon'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders mode select with options', () => {
    render(<QuestForm {...defaultProps} />);
    expect(screen.getByText('— None —')).toBeInTheDocument();
    expect(screen.getByText(/Fitness/)).toBeInTheDocument();
    expect(screen.getByText(/Hydration/)).toBeInTheDocument();
  });

  it('disables save button when title is empty', () => {
    render(<QuestForm {...defaultProps} />);
    const btn = screen.getByText('Create Quest').closest('button');
    expect(btn).toBeDisabled();
  });

  it('enables save button when title has content', () => {
    render(<QuestForm {...defaultProps} form={{ ...emptyForm, title: 'Test' }} />);
    const btn = screen.getByText('Create Quest').closest('button');
    expect(btn).not.toBeDisabled();
  });

  it('shows "Update Quest" button text when editing', () => {
    render(<QuestForm {...defaultProps} editingId={3} form={{ ...emptyForm, title: 'Existing' }} />);
    expect(screen.getByText('Update Quest')).toBeInTheDocument();
  });

  it('disables save button when saving is true', () => {
    render(<QuestForm {...defaultProps} saving={true} form={{ ...emptyForm, title: 'Test' }} />);
    const btn = screen.getByText('Create Quest').closest('button');
    expect(btn).toBeDisabled();
  });

  it('calls onSave when save button clicked', () => {
    render(<QuestForm {...defaultProps} form={{ ...emptyForm, title: 'Test' }} />);
    fireEvent.click(screen.getByText('Create Quest'));
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it('shows timer window fields when requires_timer is true', () => {
    render(<QuestForm {...defaultProps} form={{ ...emptyForm, requires_timer: true }} />);
    expect(screen.getByText('Window Start')).toBeInTheDocument();
    expect(screen.getByText('Window End')).toBeInTheDocument();
  });

  it('hides timer window fields when requires_timer is false', () => {
    render(<QuestForm {...defaultProps} />);
    expect(screen.queryByText('Window Start')).not.toBeInTheDocument();
    expect(screen.queryByText('Window End')).not.toBeInTheDocument();
  });
});
