import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  DollarSign: ({ className }: any) => <span data-testid="dollar-icon" className={className} />,
  TrendingUp: ({ className }: any) => <span data-testid="trending-up-icon" className={className} />,
  TrendingDown: ({ className }: any) => <span data-testid="trending-down-icon" className={className} />,
  PieChart: ({ className }: any) => <span data-testid="pie-icon" className={className} />,
}));

import { BudgetSummary } from '@/components/finance/BudgetSummary';

// Helper to match locale-formatted numbers
const matchNumber = (n: number) => (content: string) => {
  const stripped = content.replace(/[\s,\u00a0]/g, '');
  return stripped === String(n);
};

const baseProps = {
  totalIncome: 5000,
  totalExpense: 3200,
  balance: 1800,
  spentPercent: 64,
  byCategory: {
    Food: 1200,
    Transport: 800,
    Housing: 700,
    Entertainment: 500,
  },
};

describe('BudgetSummary', () => {
  it('renders income, expense, and balance totals', () => {
    render(<BudgetSummary {...baseProps} />);

    expect(screen.getByText(matchNumber(5000))).toBeInTheDocument();
    expect(screen.getByText(matchNumber(3200))).toBeInTheDocument();
    expect(screen.getByText(matchNumber(1800))).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
  });

  it('shows spending percentage', () => {
    render(<BudgetSummary {...baseProps} />);

    expect(screen.getByText('64%')).toBeInTheDocument();
    expect(screen.getByText('Spent')).toBeInTheDocument();
  });

  it('renders category breakdown when categories exist', () => {
    render(<BudgetSummary {...baseProps} />);

    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Housing')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
  });

  it('hides category breakdown when byCategory is empty', () => {
    render(<BudgetSummary {...baseProps} byCategory={{}} />);

    expect(screen.queryByText('Category Breakdown')).not.toBeInTheDocument();
  });

  it('shows category percentages relative to total expense', () => {
    render(<BudgetSummary {...baseProps} />);

    // Food: 1200/3200 = 37.5% → "38%"
    expect(screen.getByText('38%')).toBeInTheDocument();
    // Transport: 800/3200 = 25%
    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});
