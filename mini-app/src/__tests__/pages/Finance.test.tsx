import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Use vi.hoisted so the variable is available inside vi.mock factories
const { mockWebApp } = vi.hoisted(() => {
  const mockWebApp = {
    initData: 'test',
    initDataUnsafe: { user: { id: 123, first_name: 'Test' } } as any,
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    disableClosingConfirmation: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    enableVerticalSwipes: vi.fn(),
    colorScheme: 'dark' as const,
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
  };
  return { mockWebApp };
});

vi.mock('@twa-dev/sdk', () => ({
  default: mockWebApp,
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock child components
vi.mock('@/components/finance/BudgetTracker', () => ({
  BudgetTracker: ({ userId }: { userId: number }) =>
    <div data-testid="budget-tracker">BudgetTracker for user {userId}</div>,
}));

vi.mock('@/components/finance/SavingsGoal', () => ({
  SavingsGoal: ({ userId }: { userId: number }) =>
    <div data-testid="savings-goal">SavingsGoal for user {userId}</div>,
}));

import { Finance } from '@/pages/Finance';

describe('Finance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default user with id
    mockWebApp.initDataUnsafe = { user: { id: 123, first_name: 'Test' } };
  });

  // ── Header ──

  it('renders page header with title and subtitle', () => {
    render(<Finance />);
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Track your budget & savings')).toBeInTheDocument();
  });

  // ── Default Tab ──

  it('renders Budget tab by default', () => {
    render(<Finance />);
    expect(screen.getByTestId('budget-tracker')).toBeInTheDocument();
    expect(screen.queryByTestId('savings-goal')).not.toBeInTheDocument();
  });

  it('passes userId to BudgetTracker', () => {
    render(<Finance />);
    expect(screen.getByText('BudgetTracker for user 123')).toBeInTheDocument();
  });

  // ── Tab Switching ──

  it('switches to Savings tab when clicked', () => {
    render(<Finance />);
    fireEvent.click(screen.getByText('Savings'));

    expect(screen.getByTestId('savings-goal')).toBeInTheDocument();
    expect(screen.queryByTestId('budget-tracker')).not.toBeInTheDocument();
  });

  it('passes userId to SavingsGoal', () => {
    render(<Finance />);
    fireEvent.click(screen.getByText('Savings'));
    expect(screen.getByText('SavingsGoal for user 123')).toBeInTheDocument();
  });

  it('switches back to Budget tab after viewing Savings', () => {
    render(<Finance />);

    fireEvent.click(screen.getByText('Savings'));
    expect(screen.getByTestId('savings-goal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Budget'));
    expect(screen.getByTestId('budget-tracker')).toBeInTheDocument();
    expect(screen.queryByTestId('savings-goal')).not.toBeInTheDocument();
  });

  // ── Tab Buttons ──

  it('renders both Budget and Savings tab buttons', () => {
    render(<Finance />);
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
  });

  // ── Loading State (no user) ──

  it('shows loading spinner when user is not available', () => {
    mockWebApp.initDataUnsafe = { user: undefined as any };
    const { container } = render(<Finance />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();

    expect(screen.queryByText('Finance')).not.toBeInTheDocument();
  });

  // ── Error State (no user.id) ──

  it('shows ErrorSection when user has no id', () => {
    mockWebApp.initDataUnsafe = { user: { id: 0, first_name: 'Test' } };
    render(<Finance />);

    expect(screen.getByText('Could not identify your account')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  // ── Content isolation ──

  it('does not render SavingsGoal when Budget tab is active', () => {
    render(<Finance />);
    expect(screen.getByTestId('budget-tracker')).toBeInTheDocument();
    expect(screen.queryByTestId('savings-goal')).not.toBeInTheDocument();
  });

  it('does not render BudgetTracker when Savings tab is active', () => {
    render(<Finance />);
    fireEvent.click(screen.getByText('Savings'));
    expect(screen.getByTestId('savings-goal')).toBeInTheDocument();
    expect(screen.queryByTestId('budget-tracker')).not.toBeInTheDocument();
  });
});
