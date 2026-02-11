import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

  it('renders 5 nav items', () => {
    render(<Navigation />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Quests')).toBeInTheDocument();
    expect(screen.getByText('Rewards')).toBeInTheDocument();
    expect(screen.getByText('Ranks')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('highlights active item based on route', () => {
    mockPathname = '/quests';
    render(<Navigation />);

    const questsButton = screen.getByRole('button', { name: 'Quests' });
    expect(questsButton).toHaveAttribute('aria-current', 'page');

    const homeButton = screen.getByRole('button', { name: 'Home' });
    expect(homeButton).not.toHaveAttribute('aria-current');
  });

  it('click triggers navigation', () => {
    render(<Navigation />);

    fireEvent.click(screen.getByText('Quests'));
    expect(mockNavigate).toHaveBeenCalledWith('/quests');
  });

  it('triggers haptic feedback on tap', () => {
    render(<Navigation />);

    fireEvent.click(screen.getByText('Profile'));
    expect(mockHaptic.selection).toHaveBeenCalled();
  });

  it('shows quest badge count when provided', () => {
    render(<Navigation questBadgeCount={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
