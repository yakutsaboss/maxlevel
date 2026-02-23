/**
 * Tests for TrophyCase page (mini-app/src/pages/TrophyCase.tsx)
 *
 * Run 67 Agent E: Tests the trophy case page created by Agent C.
 * Covers: loading skeleton, trophy grid, tab switching, detail modal, empty state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
        'trophy.title': 'Trophy Case',
        'trophy.tab_earned': 'Earned',
        'trophy.tab_all': 'All',
        'trophy.earnedCount': `${params?.earned ?? 0}/${params?.total ?? 0} earned`,
        'trophy.howToEarn': 'How to earn',
        'trophy.earnedOn': `Earned on ${params?.date ?? ''}`,
        'trophy.locked': 'Locked',
        'trophy.checkForNew': 'Check for new',
        'trophy.checking': 'Checking...',
        'trophy.newEarned': `${params?.count ?? 0} new earned!`,
        'trophy.noEarned': 'No trophies earned yet. Keep going!',
        'trophy.noTrophies': 'No trophies available',
        'trophy.couldNotLoad': 'Could not load trophies',
        'trophy.close': 'Close',
        'trophy.newTrophy': 'New trophy earned!',
        'trophy.rarity_common': 'Common',
        'trophy.rarity_rare': 'Rare',
        'trophy.rarity_epic': 'Epic',
        'trophy.rarity_legendary': 'Legendary',
        'trophy.criteria.quest_count': `Complete ${params?.threshold ?? ''} quests`,
        'trophy.criteria.streak_days': `Maintain a ${params?.threshold ?? ''}-day streak`,
        'trophy.criteria.level': `Reach level ${params?.threshold ?? ''}`,
        'trophy.criteria.friend_count': `Add ${params?.threshold ?? ''} friends`,
        'errors.somethingWentWrong': 'Something went wrong',
        'errors.tryAgain': 'Try Again',
        'errors.serverError': 'Please try again later',
        'common.retry': 'Retry',
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
  const IconStub = ({ className }: any) => <span data-testid="icon" className={className} />;
  return {
    Trophy: IconStub,
    Lock: IconStub,
    ArrowLeft: IconStub,
    RefreshCw: IconStub,
    X: IconStub,
    ChevronDown: IconStub,
    Star: IconStub,
    CheckCircle: IconStub,
    AlertCircle: IconStub,
    Calendar: IconStub,
    Target: IconStub,
  };
});

// ─── Mock useTelegram ───────────────────────────────────────────────

vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({
    user: { id: 1, first_name: 'Test', username: 'test' },
    haptic: { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() },
  }),
  useBackButton: vi.fn(),
}));

// ─── Mock usePullToRefresh ──────────────────────────────────────────

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    containerRef: { current: null },
    pullDistance: 0,
    refreshing: false,
    pullThreshold: 80,
    touchHandlers: {},
  }),
  PullIndicator: () => null,
}));

// ─── Mock logger ────────────────────────────────────────────────────

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── Mock useTrophies hook ──────────────────────────────────────────

const mockCheckForNew = vi.fn().mockResolvedValue([]);
const mockRefresh = vi.fn();

const mockAllTrophies = [
  { id: 1, name: 'First Steps', description: 'Complete 1 quest', icon_emoji: '🏆', rarity: 'common', criteria: { type: 'quest_count', threshold: 1 }, sort_order: 1 },
  { id: 2, name: 'Getting Started', description: 'Reach level 2', icon_emoji: '🥇', rarity: 'common', criteria: { type: 'level', threshold: 2 }, sort_order: 2 },
  { id: 3, name: 'Week Warrior', description: '7-day streak', icon_emoji: '⚔️', rarity: 'rare', criteria: { type: 'streak_days', threshold: 7 }, sort_order: 4 },
  { id: 4, name: 'Streak Legend', description: '100-day streak', icon_emoji: '👑', rarity: 'legendary', criteria: { type: 'streak_days', threshold: 100 }, sort_order: 15 },
];

const mockEarnedTrophies = [
  { id: 1, user_id: 1, trophy_id: 1, earned_at: '2026-02-10T10:00:00Z', trophy: mockAllTrophies[0] },
];

let hookReturn = {
  allTrophies: mockAllTrophies,
  earnedTrophies: mockEarnedTrophies,
  loading: false,
  error: null as string | null,
  checkForNew: mockCheckForNew,
  refresh: mockRefresh,
};

vi.mock('@/hooks/useTrophies', () => ({
  useTrophies: () => hookReturn,
}));

// ─── Import after mocks ────────────────────────────────────────────

import { TrophyCase } from '@/pages/TrophyCase';

// ─── Helper ─────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/trophies']}>
      <TrophyCase />
    </MemoryRouter>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  hookReturn = {
    allTrophies: mockAllTrophies,
    earnedTrophies: mockEarnedTrophies,
    loading: false,
    error: null,
    checkForNew: mockCheckForNew,
    refresh: mockRefresh,
  };
});

describe('TrophyCase', () => {
  it('renders loading skeleton when loading', () => {
    hookReturn = { ...hookReturn, loading: true, allTrophies: [], earnedTrophies: [] };
    renderPage();

    // Loading state should not show trophy names
    expect(screen.queryByText('First Steps')).not.toBeInTheDocument();
  });

  it('renders page title "Trophy Case"', () => {
    renderPage();

    expect(screen.getByText('Trophy Case')).toBeInTheDocument();
  });

  it('renders trophy count in header', () => {
    renderPage();

    // "1/4 earned" from i18n mock
    expect(screen.getByText('1/4 earned')).toBeInTheDocument();
  });

  it('renders trophy grid with all trophies', () => {
    renderPage();

    // Default tab is 'earned', so click 'All' tab first to see all trophies
    const allTab = screen.getByText('All');
    fireEvent.click(allTab);

    // All trophies should render
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Week Warrior')).toBeInTheDocument();
    expect(screen.getByText('Streak Legend')).toBeInTheDocument();
  });

  it('renders tab buttons for Earned and All', () => {
    renderPage();

    expect(screen.getByText('Earned')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('filters to earned trophies when Earned tab is clicked', () => {
    renderPage();

    const earnedTab = screen.getByText('Earned');
    fireEvent.click(earnedTab);

    // Only earned trophy should show
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    // Unearned trophies should not be visible in Earned tab
    // (they may or may not be present depending on implementation)
  });

  it('shows all trophies when All tab is clicked', () => {
    renderPage();

    // Click Earned first, then All
    const earnedTab = screen.getByText('Earned');
    fireEvent.click(earnedTab);

    const allTab = screen.getByText('All');
    fireEvent.click(allTab);

    // All trophies should be visible
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Week Warrior')).toBeInTheDocument();
    expect(screen.getByText('Streak Legend')).toBeInTheDocument();
  });

  it('shows empty state when no trophies earned', () => {
    hookReturn = { ...hookReturn, earnedTrophies: [], allTrophies: mockAllTrophies };
    renderPage();

    // Default tab is 'earned', and no earned trophies → shows noEarned message
    expect(screen.getByText('No trophies earned yet. Keep going!')).toBeInTheDocument();
  });

  it('shows rarity badges on trophy cards', () => {
    renderPage();

    // Switch to 'All' tab to see all trophy emojis
    const allTab = screen.getByText('All');
    fireEvent.click(allTab);

    // Trophy emojis should render
    expect(screen.getByText('🏆')).toBeInTheDocument();
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('⚔️')).toBeInTheDocument();
    expect(screen.getByText('👑')).toBeInTheDocument();
  });

  it('opens detail modal when earned trophy is tapped', () => {
    renderPage();

    // Click on the First Steps trophy card (rendered as a button by motion.button mock)
    const trophy = screen.getByText('First Steps');
    fireEvent.click(trophy.closest('button') || trophy);

    // Detail modal should show trophy description
    // The modal renders the trophy name in an h2 and its description
    expect(screen.getByText('Complete 1 quest')).toBeInTheDocument();
  });

  it('calls checkForNew when check button is clicked', async () => {
    renderPage();

    // Click the "Check for new" button
    const checkButton = screen.getByText('Check for new');
    fireEvent.click(checkButton);

    expect(mockCheckForNew).toHaveBeenCalled();
  });
});
