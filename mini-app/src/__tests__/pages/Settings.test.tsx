import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from '@/pages/Settings';

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

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: vi.fn() }),
}));

// Mock useOnboarding
vi.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: () => ({ reset: vi.fn() }),
}));

// Mock useSettingsData
const mockUseSettingsData = vi.fn();
vi.mock('@/hooks/useSettingsData', () => ({
  useSettingsData: (...args: unknown[]) => mockUseSettingsData(...args),
}));

const mockHandleDeleteAccount = vi.fn();

const baseHookReturn = {
  loading: true,
  error: false,
  saving: false,
  deleting: false,
  prefs: {
    notifications_enabled: true,
    reminder_time: 18,
    timezone: 'Europe/Moscow',
    dnd_enabled: false,
    dnd_start: 22,
    dnd_end: 8,
    notification_modes: {
      fitness: true,
      hydration: true,
      finance: true,
      learning: true,
      medication: true,
      habits: true,
    },
  },
  setPrefs: vi.fn(),
  punishment: {
    consent_given: false,
    intensity_level: 'medium',
    safe_mode: true,
  },
  punishmentAvailable: true,
  accountabilitySaveStatus: 'idle' as const,
  toast: null,
  setToast: vi.fn(),
  loadPreferences: vi.fn(),
  handleConsentToggle: vi.fn(),
  handleIntensityChange: vi.fn(),
  handleSafeModeToggle: vi.fn(),
  handleSave: vi.fn(),
  handleDeleteAccount: mockHandleDeleteAccount,
};

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSettingsData.mockReturnValue({ ...baseHookReturn });
  });

  it('renders loading skeleton when loading', () => {
    render(<Settings />);
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('renders notification settings after data loads', () => {
    mockUseSettingsData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
    });
    render(<Settings />);

    // Page heading
    expect(screen.getByText('Settings')).toBeInTheDocument();
    // Notification toggle section
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    // Notification switch should be present with correct state
    expect(screen.getByRole('switch', { name: /notifications: on/i })).toBeInTheDocument();
  });

  it('renders danger zone with delete account button', () => {
    mockUseSettingsData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
    });
    render(<Settings />);

    // "Delete Account" appears as both heading and button
    expect(screen.getAllByText('Delete Account')).toHaveLength(2);
    expect(screen.getByText('Permanently remove your account and all data')).toBeInTheDocument();
  });

  it('calls handleDeleteAccount when delete button is clicked', () => {
    mockUseSettingsData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
    });
    render(<Settings />);

    // Find the delete button (there's a heading and a button both with "Delete Account")
    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);
    expect(mockHandleDeleteAccount).toHaveBeenCalled();
  });

  it('shows ErrorSection on error state', () => {
    mockUseSettingsData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
      error: true,
    });
    render(<Settings />);

    expect(screen.getByText('Could not load your settings')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
