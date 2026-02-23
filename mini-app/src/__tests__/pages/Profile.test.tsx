import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Profile } from '@/pages/Profile';

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
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useProfileData
const mockUseProfileData = vi.fn();
vi.mock('@/hooks/useProfileData', () => ({
  useProfileData: (...args: unknown[]) => mockUseProfileData(...args),
}));

const mockStats = {
  user: {
    id: 1,
    telegram_id: 123,
    username: 'testuser',
    first_name: 'TestUser',
    level: 5,
    xp: 500,
    xp_to_next_level: 1000,
    total_quests_completed: 15,
    current_streak: 3,
    longest_streak: 10,
    avatar_id: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
  modes: [
    {
      user_id: 1,
      mode_id: 1,
      is_active: true,
      activated_at: '2024-01-01',
      mode: { id: 1, name: 'fitness', display_name: 'Fitness', description: 'Stay fit', icon: '💪', is_active: true },
    },
  ],
  activeQuests: [],
  completedQuestsToday: 0,
  recentAchievements: [],
  xpGainedToday: 0,
  streakData: { current: 3, longest: 10, daysActive: 30 },
  perModeStreaks: [
    { mode_id: 1, mode_name: 'Fitness', mode_icon: '💪', current_streak: 3, longest_streak: 10 },
  ],
};

const baseHookReturn = {
  stats: null,
  achievements: [],
  allAchievements: [],
  loading: true,
  error: false,
  punishmentSettings: null,
  punishmentHistory: [],
  loadProfileData: vi.fn(),
  editModalOpen: false,
  setEditModalOpen: vi.fn(),
  toast: null,
  setToast: vi.fn(),
};

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProfileData.mockReturnValue({ ...baseHookReturn });
  });

  it('renders loading skeleton when loading', () => {
    render(<Profile />);
    // Profile header content should not be present
    expect(screen.queryByText('TestUser')).not.toBeInTheDocument();
    expect(screen.queryByText('Account Info')).not.toBeInTheDocument();
  });

  it('renders profile header with user data', () => {
    mockUseProfileData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
      stats: mockStats,
    });
    render(<Profile />);

    // User's first name should be visible in header
    expect(screen.getByText('TestUser')).toBeInTheDocument();
    // Account info section
    expect(screen.getByText('Account Info')).toBeInTheDocument();
    // XP progress bar
    expect(screen.getByRole('progressbar', { name: 'XP progress: 500 of 1000' })).toBeInTheDocument();
  });

  it('renders mode grid with active modes', () => {
    mockUseProfileData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
      stats: mockStats,
    });
    render(<Profile />);

    // Mode name should be visible
    expect(screen.getByText('Fitness')).toBeInTheDocument();
  });

  it('renders streak section with current and longest streak', () => {
    mockUseProfileData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
      stats: mockStats,
    });
    render(<Profile />);

    // ProfileStreak renders with aria-label
    expect(screen.getByRole('region', { name: /streak: 3 days current, 10 days best/i })).toBeInTheDocument();
    // Streak text content
    expect(screen.getByText('3 days')).toBeInTheDocument();
  });

  it('shows ErrorSection on error state', () => {
    mockUseProfileData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
      error: true,
      stats: null,
    });
    render(<Profile />);

    expect(screen.getByText('Could not load your profile')).toBeInTheDocument();
    expect(screen.getByText(/Try Again/)).toBeInTheDocument();
  });
});
