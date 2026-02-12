import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('lucide-react', () => ({
  Plus: (props: any) => <span data-testid="plus-icon" {...props} />,
  Pencil: (props: any) => <span data-testid="pencil-icon" {...props} />,
  Trash2: (props: any) => <span data-testid="trash-icon" {...props} />,
  Save: (props: any) => <span data-testid="save-icon" {...props} />,
  X: (props: any) => <span data-testid="x-icon" {...props} />,
  RefreshCw: (props: any) => <span data-testid="refresh-icon" {...props} />,
  Clock: (props: any) => <span data-testid="clock-icon" {...props} />,
  Timer: (props: any) => <span data-testid="timer-icon" {...props} />,
}));

vi.mock('@/components/Toast', () => ({
  Toast: ({ message, variant }: { message: string; variant: string }) => (
    <div data-testid="toast" data-variant={variant}>{message}</div>
  ),
}));

vi.mock('@/api/adminClient', () => ({
  API_BASE_URL: 'http://localhost:3000/api',
}));

import { AdminQuestEditor } from '@/components/admin/AdminQuestEditor';

const mockQuests = [
  {
    id: 1,
    mode_id: 1,
    title: 'Morning Workout',
    description: 'Do 30 mins of exercise',
    quest_type: 'daily' as const,
    xp_reward: 50,
    difficulty: 'medium' as const,
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
    quest_type: 'daily' as const,
    xp_reward: 25,
    difficulty: 'easy' as const,
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

const mockModes = [
  { id: 1, name: 'fitness', display_name: 'Fitness', icon_emoji: '\u{1F3CB}\u{FE0F}' },
  { id: 2, name: 'hydration', display_name: 'Hydration', icon_emoji: '\u{1F4A7}' },
];

describe('AdminQuestEditor', () => {
  const defaultProps = { credentials: 'dGVzdA==' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  function setupFetchMock(options?: { questsOk?: boolean; modesOk?: boolean }) {
    const { questsOk = true, modesOk = true } = options ?? {};

    vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.includes('/admin/quests') && !urlStr.includes('/admin/quests/')) {
        if (!questsOk) return { ok: false, status: 500, json: () => Promise.resolve({}) } as Response;
        return {
          ok: true,
          json: () => Promise.resolve({ data: { quests: mockQuests } }),
        } as Response;
      }

      if (urlStr.includes('/admin/modes')) {
        if (!modesOk) return { ok: false, status: 500, json: () => Promise.resolve({}) } as Response;
        return {
          ok: true,
          json: () => Promise.resolve({ data: { modes: mockModes } }),
        } as Response;
      }

      return { ok: true, json: () => Promise.resolve({}) } as Response;
    });
  }

  it('shows loading skeleton initially', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));

    render(<AdminQuestEditor {...defaultProps} />);

    expect(screen.getByText('Quest Templates')).toBeInTheDocument();
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons.length).toBe(4);
  });

  it('renders quest list after loading', async () => {
    setupFetchMock();

    render(<AdminQuestEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Morning Workout')).toBeInTheDocument();
    });

    expect(screen.getByText('Drink Water')).toBeInTheDocument();
    expect(screen.getByText('Quest Templates (2)')).toBeInTheDocument();
    expect(screen.getByText('50 XP')).toBeInTheDocument();
    expect(screen.getByText('25 XP')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('easy')).toBeInTheDocument();
  });

  it('shows empty state when no quests', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/admin/quests')) {
        return { ok: true, json: () => Promise.resolve({ data: { quests: [] } }) } as Response;
      }
      if (urlStr.includes('/admin/modes')) {
        return { ok: true, json: () => Promise.resolve({ data: { modes: mockModes } }) } as Response;
      }
      return { ok: true, json: () => Promise.resolve({}) } as Response;
    });

    render(<AdminQuestEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No quest templates yet')).toBeInTheDocument();
    });
  });

  it('opens add form when Add Quest button clicked', async () => {
    setupFetchMock();

    render(<AdminQuestEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Morning Workout')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Quest'));

    expect(screen.getByText('New Quest')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Morning Workout')).toBeInTheDocument();
    expect(screen.getByText('Create Quest')).toBeInTheDocument();
  });

  it('closes form when X button clicked', async () => {
    setupFetchMock();

    render(<AdminQuestEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Morning Workout')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Quest'));
    expect(screen.getByText('New Quest')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('x-icon'));

    expect(screen.queryByText('New Quest')).not.toBeInTheDocument();
  });

  it('shows toast on save with empty title', async () => {
    setupFetchMock();

    render(<AdminQuestEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Morning Workout')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Quest'));

    // The create button should be disabled when title is empty
    const createBtn = screen.getByText('Create Quest');
    expect(createBtn.closest('button')).toBeDisabled();
  });

  it('sends POST request when creating quest', async () => {
    setupFetchMock();

    render(<AdminQuestEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Morning Workout')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Quest'));

    const titleInput = screen.getByPlaceholderText('e.g. Morning Workout');
    fireEvent.change(titleInput, { target: { value: 'New Test Quest' } });

    // Override fetch for the POST call
    const fetchSpy = vi.spyOn(global, 'fetch');

    fireEvent.click(screen.getByText('Create Quest'));

    await waitFor(() => {
      const postCalls = fetchSpy.mock.calls.filter(
        (call) => {
          const opts = call[1] as RequestInit | undefined;
          return opts?.method === 'POST';
        }
      );
      expect(postCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays quest type and timer badges', async () => {
    setupFetchMock();

    render(<AdminQuestEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Drink Water')).toBeInTheDocument();
    });

    // Both quests are daily
    const dailyBadges = screen.getAllByText('daily');
    expect(dailyBadges.length).toBe(2);

    // Timer badge for Drink Water quest
    expect(screen.getByText('08:00\u201320:00')).toBeInTheDocument();
  });
});
