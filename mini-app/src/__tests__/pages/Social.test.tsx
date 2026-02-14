/**
 * Tests for Social page (mini-app/src/pages/Social.tsx)
 *
 * Run 61 Agent C: Rewritten to use useSocial hook mock (Agent B refactors
 * Social.tsx from inline fetch() to useSocial hook). Added pending requests tests.
 *
 * Mocks: useSocial, usePullToRefresh, @twa-dev/sdk, react-router-dom,
 *        social sub-components, ErrorSection, lucide-react
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock @twa-dev/sdk
vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'test',
    initDataUnsafe: { user: { id: 123, first_name: 'Test' } },
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    disableClosingConfirmation: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    enableVerticalSwipes: vi.fn(),
    colorScheme: 'dark',
    themeParams: {},
    platform: 'tdesktop',
    version: '7.0',
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
    MainButton: {
      show: vi.fn(), hide: vi.fn(), enable: vi.fn(), disable: vi.fn(),
      setText: vi.fn(), onClick: vi.fn(), offClick: vi.fn(),
      showProgress: vi.fn(), hideProgress: vi.fn(), color: '', textColor: '',
    },
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    showPopup: vi.fn(),
    openLink: vi.fn(),
    openTelegramLink: vi.fn(),
    sendData: vi.fn(),
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock useSocial hook (Agent B creates this in Run 61)
const mockUseSocial = vi.fn();
vi.mock('@/hooks/useSocial', () => ({
  useSocial: (...args: unknown[]) => mockUseSocial(...args),
}));

// Mock usePullToRefresh
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    containerRef: { current: null },
    pullDistance: 0,
    refreshing: false,
    pullThreshold: 60,
    touchHandlers: {
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
  PullIndicator: () => null,
}));

// Mock child components to isolate page logic
vi.mock('@/components/social/FriendsList', () => ({
  FriendsList: ({ friends }: { friends: unknown[] }) =>
    friends.length === 0
      ? <p>No friends yet. Send a friend request!</p>
      : <div data-testid="friends-list">{friends.map((f: any) => <div key={f.id}>{f.first_name}</div>)}</div>,
}));

vi.mock('@/components/social/ChallengesList', () => ({
  ChallengesList: ({ challenges }: { challenges: unknown[] }) =>
    challenges.length === 0
      ? <p>No challenges yet. Create one!</p>
      : <div data-testid="challenges-list">{challenges.map((c: any) => <div key={c.id}>{c.title}</div>)}</div>,
}));

vi.mock('@/components/social/FriendRequestForm', () => ({
  FriendRequestForm: ({ onSuccess }: { onSuccess: () => void }) =>
    <div data-testid="friend-request-form"><button onClick={onSuccess}>Send</button></div>,
}));

vi.mock('@/components/social/ChallengeForm', () => ({
  ChallengeForm: ({ onSuccess }: { onSuccess: () => void }) =>
    <div data-testid="challenge-form"><button onClick={onSuccess}>Create</button></div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const s = (name: string) => (props: any) => <span data-testid={`${name}-icon`} {...props} />;
  return {
    Users: s('users'),
    Swords: s('swords'),
    UserPlus: s('user-plus'),
    PlusCircle: s('plus-circle'),
    X: s('x'),
    Star: s('star'),
    Zap: s('zap'),
    Trophy: s('trophy'),
    Target: s('target'),
    AlertCircle: s('alert-circle'),
    RefreshCw: s('refresh'),
    Check: s('check'),
    XCircle: s('x-circle'),
    Bell: s('bell'),
  };
});

// ─── Import after mocks ─────────────────────────────────────────────

import { Social } from '@/pages/Social';

// ─── Test data ──────────────────────────────────────────────────────

const mockFriends = [
  { id: 1, username: 'alice', first_name: 'Alice', current_level: 5, total_xp: 1200, is_active: true, friends_since: '2024-01-01' },
  { id: 2, username: null, first_name: 'Bob', current_level: 3, total_xp: 400, is_active: false, friends_since: '2024-02-15' },
];

const mockPending = [
  { id: 10, from_user: { id: 4, username: 'charlie', first_name: 'Charlie', current_level: 7 }, created_at: '2026-02-10T12:00:00Z' },
  { id: 11, from_user: { id: 5, username: 'diana', first_name: 'Diana', current_level: 2 }, created_at: '2026-02-11T08:00:00Z' },
];

const mockChallenges = [
  { id: 10, title: '7-Day Streak', description: 'Maintain a 7-day streak', mode: 'fitness', target_value: 7, start_date: '2024-06-01', end_date: '2024-06-08', status: 'active', progress: 3, participant_count: 4 },
  { id: 11, title: 'Read 5 Books', description: null, mode: null, target_value: 5, start_date: '2024-06-01', end_date: null, status: 'active', progress: 1, participant_count: 2 },
];

const baseSocialReturn = {
  friends: mockFriends,
  pendingRequests: [],
  challenges: mockChallenges,
  loading: false,
  error: false,
  refresh: vi.fn(),
  sendRequest: vi.fn(),
  acceptRequest: vi.fn(),
  rejectRequest: vi.fn(),
  removeFriend: vi.fn(),
  joinChallenge: vi.fn(),
};

// ─── Tests ──────────────────────────────────────────────────────────

describe('Social', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSocial.mockReturnValue({ ...baseSocialReturn });
  });

  // ── Loading State ──

  it('renders loading skeleton initially', () => {
    mockUseSocial.mockReturnValue({
      ...baseSocialReturn,
      loading: true,
      friends: [],
      pendingRequests: [],
      challenges: [],
    });

    render(<Social />);

    // Skeleton should render, not the actual content sections
    expect(screen.queryByTestId('friends-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('challenges-list')).not.toBeInTheDocument();
  });

  // ── Loaded – Friends ──

  it('renders friends list when data is loaded', () => {
    render(<Social />);

    expect(screen.getByTestId('friends-list')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows "no friends" message when friends list is empty', () => {
    mockUseSocial.mockReturnValue({
      ...baseSocialReturn,
      friends: [],
    });

    render(<Social />);

    expect(screen.getByText('No friends yet. Send a friend request!')).toBeInTheDocument();
  });

  // ── Loaded – Challenges ──

  it('renders challenge cards when challenges exist', () => {
    render(<Social />);

    expect(screen.getByTestId('challenges-list')).toBeInTheDocument();
    expect(screen.getByText('7-Day Streak')).toBeInTheDocument();
    expect(screen.getByText('Read 5 Books')).toBeInTheDocument();
  });

  it('shows "no challenges" message when challenges list is empty', () => {
    mockUseSocial.mockReturnValue({
      ...baseSocialReturn,
      challenges: [],
    });

    render(<Social />);

    expect(screen.getByText('No challenges yet. Create one!')).toBeInTheDocument();
  });

  // ── Error State ──

  it('shows error state on failure', () => {
    mockUseSocial.mockReturnValue({
      ...baseSocialReturn,
      loading: false,
      error: true,
      friends: [],
      pendingRequests: [],
      challenges: [],
    });

    render(<Social />);

    // ErrorSection renders Retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  // ── ARIA Regions ──

  it('renders Friends and Challenges sections with ARIA regions', () => {
    render(<Social />);

    expect(screen.getByRole('region', { name: 'Friends' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Challenges' })).toBeInTheDocument();
  });

  // ── Pending Requests (Run 61 — new feature by Agent B) ──

  it('renders pending friend requests section when there are pending requests', () => {
    mockUseSocial.mockReturnValue({
      ...baseSocialReturn,
      pendingRequests: mockPending,
    });

    render(<Social />);

    // Should display pending request info (names or count)
    const pageContent = document.body.textContent || '';
    // The page should mention pending requests somehow
    expect(
      pageContent.includes('Charlie') || pageContent.includes('pending') || pageContent.includes('Pending'),
    ).toBe(true);
  });

  it('does not show pending section when no pending requests', () => {
    mockUseSocial.mockReturnValue({
      ...baseSocialReturn,
      pendingRequests: [],
    });

    render(<Social />);

    // Should not have any pending request content when list is empty
    const pageContent = document.body.textContent || '';
    expect(pageContent).not.toContain('Charlie');
    expect(pageContent).not.toContain('Diana');
  });
});
