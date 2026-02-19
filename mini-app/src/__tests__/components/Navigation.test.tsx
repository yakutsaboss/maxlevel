import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.home': 'Home',
        'nav.quests': 'Quests',
        'nav.rewards': 'Rewards',
        'nav.ranks': 'Ranks',
        'nav.profile': 'Profile',
        'nav.more': 'More',
        'nav.trophies': 'Trophies',
        'nav.social': 'Social',
        'nav.finance': 'Finance',
        'nav.shop': 'Shop',
        'nav.analytics': 'Analytics',
        'nav.activities': 'Activities',
        'nav.knowledge': 'Knowledge',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock lucide-react icons used by Navigation
vi.mock('lucide-react', () => ({
  Home: (props: any) => <span data-testid="icon-home" {...props} />,
  Target: (props: any) => <span data-testid="icon-quests" {...props} />,
  Award: (props: any) => <span data-testid="icon-rewards" {...props} />,
  Trophy: (props: any) => <span data-testid="icon-ranks" {...props} />,
  User: (props: any) => <span data-testid="icon-profile" {...props} />,
  Users: (props: any) => <span data-testid="icon-users" {...props} />,
  Medal: (props: any) => <span data-testid="icon-medal" {...props} />,
  MoreHorizontal: (props: any) => <span data-testid="icon-more" {...props} />,
  DollarSign: (props: any) => <span data-testid="icon-finance" {...props} />,
  ShoppingBag: (props: any) => <span data-testid="icon-shop" {...props} />,
  BarChart3: (props: any) => <span data-testid="icon-analytics" {...props} />,
  Dumbbell: (props: any) => <span data-testid="icon-dumbbell" {...props} />,
  BookOpen: (props: any) => <span data-testid="icon-bookopen" {...props} />,
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
  useTelegram: () => ({ haptic: mockHaptic }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { Navigation } from '@/components/Navigation';

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/dashboard';
  });

  it('renders 5 primary nav items + More button', () => {
    render(<Navigation />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Quests')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.getByText('Rewards')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
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
