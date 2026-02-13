import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Social } from '@/pages/Social';

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

vi.mock('@/components/social/ChallengeCard', () => ({
  ChallengeCard: ({ challenge }: { challenge: any }) =>
    <div data-testid="challenge-card">{challenge.title}</div>,
}));

// Helpers
const mockFriends = [
  { id: 1, username: 'alice', first_name: 'Alice', current_level: 5, total_xp: 1200, is_active: true, friends_since: '2024-01-01' },
  { id: 2, username: null, first_name: 'Bob', current_level: 3, total_xp: 400, is_active: false, friends_since: '2024-02-15' },
];

const mockChallenges = [
  { id: 10, title: '7-Day Streak', description: 'Maintain a 7-day streak', mode: 'fitness', target_value: 7, start_date: '2024-06-01', end_date: '2024-06-08', status: 'active', progress: 3, participant_count: 4 },
  { id: 11, title: 'Read 5 Books', description: null, mode: null, target_value: 5, start_date: '2024-06-01', end_date: null, status: 'active', progress: 1, participant_count: 2 },
];

function mockFetchSuccess(friends: unknown[] = [], challenges: unknown[] = []) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.includes('/social/friends/')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: friends }),
      });
    }
    if (url.includes('/social/challenges/')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: challenges }),
      });
    }
    return Promise.reject(new Error('Unknown URL'));
  });
}

function mockFetchFailure() {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
}

describe('Social', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  // ── Loading State ──

  it('renders loading skeleton initially', () => {
    // fetch never resolves → stays in loading state
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    render(<Social />);

    // Skeleton has animate-pulse class; real content headings are absent
    expect(screen.queryByText('Social')).not.toBeInTheDocument();
    expect(screen.queryByText('Friends')).not.toBeInTheDocument();
  });

  // ── Loaded – Friends ──

  it('renders friends list when data is loaded', async () => {
    mockFetchSuccess(mockFriends, []);
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('Friends')).toBeInTheDocument();
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows "no friends" message when friends list is empty', async () => {
    mockFetchSuccess([], []);
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('No friends yet. Send a friend request!')).toBeInTheDocument();
    });
  });

  // ── Loaded – Challenges ──

  it('renders challenge cards when challenges exist', async () => {
    mockFetchSuccess([], mockChallenges);
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('Challenges')).toBeInTheDocument();
    });

    expect(screen.getByText('7-Day Streak')).toBeInTheDocument();
    expect(screen.getByText('Read 5 Books')).toBeInTheDocument();
  });

  it('shows "no challenges" message when challenges list is empty', async () => {
    mockFetchSuccess([], []);
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('No challenges yet. Create one!')).toBeInTheDocument();
    });
  });

  // ── Error State ──

  it('shows ErrorSection on fetch failure', async () => {
    mockFetchFailure();
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('Could not load social data')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('retries loading data when Retry is clicked', async () => {
    mockFetchFailure();
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    // Switch to success and click retry
    mockFetchSuccess(mockFriends, mockChallenges);
    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Friends')).toBeInTheDocument();
    });
  });

  // ── Header ──

  it('renders page header with title and subtitle', async () => {
    mockFetchSuccess([], []);
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('Social')).toBeInTheDocument();
    });
    expect(screen.getByText('Friends & challenges')).toBeInTheDocument();
  });

  // ── Friend Request Form ──

  it('toggles friend request form with Add Friend button', async () => {
    mockFetchSuccess([], []);
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('Add Friend')).toBeInTheDocument();
    });

    // Form should not be visible initially
    expect(screen.queryByText("Friend's Telegram ID")).not.toBeInTheDocument();

    // Click Add Friend to open form
    fireEvent.click(screen.getByText('Add Friend'));
    expect(screen.getByText("Friend's Telegram ID")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Telegram ID')).toBeInTheDocument();

    // Click Cancel to close form
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText("Friend's Telegram ID")).not.toBeInTheDocument();
  });

  it('submits friend request and shows success message', async () => {
    mockFetchSuccess([], []);
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('Add Friend')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Friend'));

    const input = screen.getByPlaceholderText('Enter Telegram ID');
    fireEvent.change(input, { target: { value: '456' } });

    // Mock the friend request POST
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });

    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Friend request sent!')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid Telegram ID in friend form', async () => {
    mockFetchSuccess([], []);
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('Add Friend')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Friend'));

    const input = screen.getByPlaceholderText('Enter Telegram ID');
    fireEvent.change(input, { target: { value: '-5' } });

    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid Telegram ID')).toBeInTheDocument();
    });
  });

  // ── Challenge Form ──

  it('toggles challenge creation form with New Challenge button', async () => {
    mockFetchSuccess([], []);
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('New Challenge')).toBeInTheDocument();
    });

    // Form should not be visible initially
    expect(screen.queryByText('Title *')).not.toBeInTheDocument();

    // Open form
    fireEvent.click(screen.getByText('New Challenge'));
    expect(screen.getByText('Title *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Challenge title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. fitness, study')).toBeInTheDocument();

    // Close form
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.queryByText('Title *')).not.toBeInTheDocument();
  });

  // ── ARIA Regions ──

  it('renders Friends and Challenges sections with ARIA regions', async () => {
    mockFetchSuccess(mockFriends, mockChallenges);
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('Friends')).toBeInTheDocument();
    });

    expect(screen.getByRole('region', { name: 'Friends' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Challenges' })).toBeInTheDocument();
  });
});
