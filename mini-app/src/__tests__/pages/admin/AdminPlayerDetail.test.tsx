/**
 * Tests for AdminPlayerDetail page (mini-app/src/pages/admin/AdminPlayerDetail.tsx)
 *
 * Run 77 Agent I: Tests the admin player detail page created by Agent C.
 * Covers: loading state, breadcrumb navigation, tab rendering, tab switching,
 *         overview stats, quest history, error state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ─── Mock navigate ──────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

// ─── Mock react-i18next ─────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const keys: Record<string, string> = {
        'admin.playerDetail.title': 'Player Detail',
        'admin.playerDetail.overview': 'Overview',
        'admin.playerDetail.activity': 'Activity Timeline',
        'admin.playerDetail.modes': 'Mode Progress',
        'admin.playerDetail.quests': 'Quest History',
        'admin.playerDetail.achievements': 'Achievements',
        'admin.playerDetail.financial': 'Financial Summary',
        'admin.playerDetail.social': 'Social',
        'admin.playerDetail.settings': 'Settings',
        'admin.playerDetail.punishment': 'Punishment History',
        'admin.playerDetail.level': 'Level',
        'admin.playerDetail.xp': 'Total XP',
        'admin.playerDetail.tier': 'Tier',
        'admin.playerDetail.streak': 'Streak',
        'admin.playerDetail.joined': 'Joined',
        'admin.playerDetail.lastActive': 'Last Active',
        'admin.playerDetail.back': 'Back to Players',
        'admin.playerDetail.loading': 'Loading player...',
        'admin.playerDetail.notFound': 'Player not found',
        'admin.playerDetail.questsCompleted': `${params?.count ?? 0} quests completed`,
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.retry': 'Retry',
        'errors.somethingWentWrong': 'Something went wrong',
      };
      return keys[key] || key;
    },
  }),
}));

// ─── Mock framer-motion ─────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, className, style, onClick, role, ...rest }: any) => (
      <div className={className} style={style} onClick={onClick} role={role}>
        {children}
      </div>
    ),
    button: ({ children, onClick, className, type, ...rest }: any) => (
      <button onClick={onClick} className={className} type={type || 'button'}>
        {children}
      </button>
    ),
  },
}));

// ─── Mock lucide-react ──────────────────────────────────────────────

vi.mock('lucide-react', () => {
  const IconStub = ({ className, onClick }: any) => (
    <span data-testid="icon" className={className} onClick={onClick} />
  );
  return new Proxy({}, {
    get: (_target: unknown, prop: string) => {
      if (prop === '__esModule') return true;
      return IconStub;
    },
  });
});

// ─── Mock useTelegram ───────────────────────────────────────────────

vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({
    user: { id: 1, first_name: 'Admin', username: 'admin' },
    haptic: { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() },
  }),
  useBackButton: vi.fn(),
}));

// ─── Mock fetch for API calls ───────────────────────────────────────

const mockPlayerData = {
  player: {
    id: 1,
    telegram_id: 123456789,
    username: 'alice',
    first_name: 'Alice',
    current_level: 10,
    total_xp: 5000,
    tier: 'premium',
    is_active: true,
    streak_days: 7,
    last_active: '2025-02-15T12:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  modes: [
    { mode_id: 1, name: 'fitness', activated_at: '2025-01-01T00:00:00Z' },
    { mode_id: 2, name: 'finance', activated_at: '2025-01-15T00:00:00Z' },
  ],
  quests: [
    { id: 1, title: 'Morning Run', status: 'completed', completed_at: '2025-02-14T08:00:00Z', xp_reward: 100 },
    { id: 2, title: 'Read 30 min', status: 'completed', completed_at: '2025-02-13T20:00:00Z', xp_reward: 50 },
  ],
  achievements: [
    { id: 1, name: 'Early Bird', earned_at: '2025-01-15T00:00:00Z' },
    { id: 2, name: 'Streak Master', earned_at: '2025-02-01T00:00:00Z' },
  ],
};

const mockFetch = vi.fn();

// ─── Import component after mocks ──────────────────────────────────

import { AdminPlayerDetail } from '@/pages/admin/AdminPlayerDetail';

// ─── Helper ─────────────────────────────────────────────────────────

function renderWithRouter(playerId: string = '1') {
  return render(
    <MemoryRouter initialEntries={[`/admin/players/${playerId}`]}>
      <Routes>
        <Route path="/admin/players/:id" element={<AdminPlayerDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('AdminPlayerDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockPlayerData }),
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);
  });

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    renderWithRouter();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders breadcrumb navigation back to player list', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    const backButton = screen.getByText(/back to players/i);
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/players');
  });

  it('renders player overview with stats', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    // Check key stats are rendered
    expect(screen.getByText('10')).toBeInTheDocument(); // level
    expect(screen.getByText('5000')).toBeInTheDocument(); // xp
    expect(screen.getByText(/premium/i)).toBeInTheDocument(); // tier
  });

  it('renders tabs for different sections', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    // Check that main tabs are rendered
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Quest History')).toBeInTheDocument();
    expect(screen.getByText('Achievements')).toBeInTheDocument();
  });

  it('switches tabs when clicked', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    // Click Quest History tab
    fireEvent.click(screen.getByText('Quest History'));

    // Should show quest data
    await waitFor(() => {
      expect(screen.getByText('Morning Run')).toBeInTheDocument();
    });
  });

  it('shows quest history with completion data', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    // Switch to quests tab
    fireEvent.click(screen.getByText('Quest History'));

    await waitFor(() => {
      expect(screen.getByText('Morning Run')).toBeInTheDocument();
      expect(screen.getByText('Read 30 min')).toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: 'Server error' }),
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/error|something went wrong/i)).toBeInTheDocument();
    });
  });

  it('shows not found state for non-existent player', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'Player not found' }),
    });

    renderWithRouter('9999');

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });

  it('displays active modes on overview', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    // Check that modes are shown
    expect(screen.getByText(/fitness/i)).toBeInTheDocument();
    expect(screen.getByText(/finance/i)).toBeInTheDocument();
  });
});
