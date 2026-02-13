import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
    button: ({ children, className, disabled, onClick, ...props }: any) => (
      <button className={className} disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Target: ({ className }: any) => <span data-testid="target-icon" className={className} />,
  Calendar: ({ className }: any) => <span data-testid="calendar-icon" className={className} />,
  TrendingUp: ({ className }: any) => <span data-testid="trending-up-icon" className={className} />,
  Wallet: ({ className }: any) => <span data-testid="wallet-icon" className={className} />,
}));

// Mock GoalContribution to isolate GoalCard tests
vi.mock('@/components/finance/GoalContribution', () => ({
  GoalContribution: ({ goalId, isOpen, submitting }: any) => (
    <div data-testid={`goal-contribution-${goalId}`} data-open={isOpen} data-submitting={submitting} />
  ),
}));

// Mock getProjectedCompletion
vi.mock('@/components/finance/useSavingsGoals', () => ({
  getProjectedCompletion: (goal: any) =>
    goal.current_amount >= goal.target_amount ? 'Completed!' : '3/15/2026',
}));

import { GoalCard } from '@/components/finance/GoalCard';

const makeGoal = (overrides: Record<string, any> = {}) => ({
  id: 1,
  name: 'Emergency Fund',
  target_amount: 10000,
  current_amount: 4500,
  created_at: '2026-01-01',
  deposits: [
    { id: 1, amount: 2000, created_at: '2026-01-05' },
    { id: 2, amount: 1500, created_at: '2026-01-15' },
    { id: 3, amount: 1000, created_at: '2026-01-25' },
  ],
  ...overrides,
});

const defaultProps = {
  index: 0,
  depositGoalId: null as number | null,
  onToggleDeposit: vi.fn(),
  submitting: false,
  onDeposit: vi.fn().mockResolvedValue(true),
};

describe('GoalCard', () => {
  it('renders goal name and creation date', () => {
    render(<GoalCard goal={makeGoal()} {...defaultProps} />);

    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText(/Created/)).toBeInTheDocument();
  });

  it('displays progress percentage correctly (45%)', () => {
    render(<GoalCard goal={makeGoal()} {...defaultProps} />);

    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('caps progress at 100% when current exceeds target', () => {
    render(
      <GoalCard
        goal={makeGoal({ current_amount: 15000, target_amount: 10000 })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows deposit (wallet) button for incomplete goals', () => {
    render(<GoalCard goal={makeGoal()} {...defaultProps} />);

    expect(screen.getByTestId('wallet-icon')).toBeInTheDocument();
  });

  it('hides deposit button for completed goals', () => {
    render(
      <GoalCard
        goal={makeGoal({ current_amount: 10000, target_amount: 10000 })}
        {...defaultProps}
      />,
    );

    expect(screen.queryByTestId('wallet-icon')).not.toBeInTheDocument();
  });

  it('calls onToggleDeposit when wallet button is clicked', () => {
    const onToggleDeposit = vi.fn();
    render(
      <GoalCard
        goal={makeGoal()}
        {...defaultProps}
        onToggleDeposit={onToggleDeposit}
      />,
    );

    fireEvent.click(screen.getByTestId('wallet-icon').closest('button')!);
    expect(onToggleDeposit).toHaveBeenCalledWith(1);
  });

  it('shows projected completion date', () => {
    render(<GoalCard goal={makeGoal()} {...defaultProps} />);

    expect(screen.getByText('Projected: 3/15/2026')).toBeInTheDocument();
  });

  it('shows "Completed!" projection for finished goals', () => {
    render(
      <GoalCard
        goal={makeGoal({ current_amount: 10000, target_amount: 10000 })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText('Projected: Completed!')).toBeInTheDocument();
  });

  it('renders recent deposits section when deposits exist', () => {
    render(<GoalCard goal={makeGoal()} {...defaultProps} />);

    expect(screen.getByText('Recent deposits')).toBeInTheDocument();
    // Shows up to 5 deposits, our mock has 3
    const depositAmounts = screen.getAllByText((_content, element) => {
      const text = element?.textContent?.replace(/[\s\u00a0]/g, '') ?? '';
      return text.startsWith('+') && /^\+[\d,]+$/.test(text);
    });
    expect(depositAmounts).toHaveLength(3);
  });

  it('hides deposits section when no deposits', () => {
    render(
      <GoalCard goal={makeGoal({ deposits: [] })} {...defaultProps} />,
    );

    expect(screen.queryByText('Recent deposits')).not.toBeInTheDocument();
  });

  it('passes correct props to GoalContribution', () => {
    render(
      <GoalCard
        goal={makeGoal()}
        {...defaultProps}
        depositGoalId={1}
        submitting={true}
      />,
    );

    const contribution = screen.getByTestId('goal-contribution-1');
    expect(contribution).toHaveAttribute('data-open', 'true');
    expect(contribution).toHaveAttribute('data-submitting', 'true');
  });
});
