import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.home': 'Home',
        'nav.quests': 'Quests',
        'nav.ranks': 'Ranks',
        'nav.profile': 'Profile',
        'nav.settings': 'Settings',
        'nav.medications': 'Medications',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock lucide-react icons used by Navigation
vi.mock('lucide-react', () => ({
  Home: (props: any) => <span data-testid="icon-home" {...props} />,
  Target: (props: any) => <span data-testid="icon-quests" {...props} />,
  User: (props: any) => <span data-testid="icon-profile" {...props} />,
  Trophy: (props: any) => <span data-testid="icon-ranks" {...props} />,
  Settings: (props: any) => <span data-testid="icon-settings" {...props} />,
  Pill: (props: any) => <span data-testid="icon-pill" {...props} />,
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
let mockPathname = '/dashboard';
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mockPathname }),
  useNavigate: () => mockNavigate,
}));

// Mock useTelegram
const mockHaptic = {
  impact: vi.fn(),
  notification: vi.fn(),
  selection: vi.fn(),
};
vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({ haptic: mockHaptic, user: { id: 123 } }),
}));

// Mock useDashboardQuery (Navigation uses useDashboardStats to check medication mode)
vi.mock('@/hooks/useDashboardQuery', () => ({
  useDashboardStats: () => ({ data: undefined, isLoading: false }),
  dashboardKeys: { all: ['dashboard'], stats: (id: number) => ['dashboard', 'stats', id] },
}));

// Mock framer-motion using shared mock (supports motion.button, motion.div, etc.)
vi.mock('framer-motion', () => framerMotionMock);

import { Navigation } from '@/components/Navigation';

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/dashboard';
  });

  it('renders 5 primary nav items', () => {
    render(<Navigation />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Quests')).toBeInTheDocument();
    expect(screen.getByText('Ranks')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights active item based on route', () => {
    mockPathname = '/quests';
    render(<Navigation />);

    const questsTab = screen.getByRole('tab', { name: 'Quests' });
    expect(questsTab).toHaveAttribute('aria-current', 'page');

    const homeTab = screen.getByRole('tab', { name: 'Home' });
    expect(homeTab).not.toHaveAttribute('aria-current');
  });

  it('click triggers navigation', () => {
    render(<Navigation />);

    fireEvent.click(screen.getByText('Quests'));
    expect(mockNavigate).toHaveBeenCalledWith('/quests');
  });

  it('triggers haptic feedback on tap', () => {
    render(<Navigation />);

    fireEvent.click(screen.getByText('Quests'));
    expect(mockHaptic.selection).toHaveBeenCalled();
  });

  it('shows quest badge count when provided', () => {
    render(<Navigation questBadgeCount={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
