import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
    button: ({ children, className, disabled, onClick, type, ...props }: any) => (
      <button className={className} disabled={disabled} onClick={onClick} type={type}>
        {children}
      </button>
    ),
    form: ({ children, className, onSubmit, ...props }: any) => (
      <form className={className} onSubmit={onSubmit}>{children}</form>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  DollarSign: ({ className }: any) => <span data-testid="dollar-icon" className={className} />,
  TrendingUp: ({ className }: any) => <span data-testid="trending-up-icon" className={className} />,
  TrendingDown: ({ className }: any) => <span data-testid="trending-down-icon" className={className} />,
  PlusCircle: ({ className }: any) => <span data-testid="plus-icon" className={className} />,
  PieChart: ({ className }: any) => <span data-testid="pie-icon" className={className} />,
  Loader2: ({ className }: any) => <span data-testid="loader-icon" className={className} />,
}));

import { BudgetTracker } from '@/components/finance/BudgetTracker';

// Helper to match locale-formatted numbers (handles both comma and space separators)
const matchNumber = (n: number) => (content: string) => {
  const stripped = content.replace(/[\s,\u00a0]/g, '');
  return stripped === String(n);
};

const mockSummary = {
  total_income: 5000,
  total_expense: 3200,
  balance: 1800,
  entries: [
    { id: 1, category: 'Food', amount: 1200, type: 'expense' as const, created_at: '2026-01-15' },
    { id: 2, category: 'Transport', amount: 800, type: 'expense' as const, created_at: '2026-01-16' },
    { id: 3, category: 'Income', amount: 5000, type: 'income' as const, created_at: '2026-01-01' },
  ],
  by_category: {
    Food: 1200,
    Transport: 800,
    Housing: 700,
    Entertainment: 500,
  },
};

describe('BudgetTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('shows loading spinner initially', () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

    render(<BudgetTracker userId={1} />);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('renders budget summary after loading', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockSummary }),
    } as Response);

    render(<BudgetTracker userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Budget Summary')).toBeInTheDocument();
    });

    expect(screen.getByText(matchNumber(5000))).toBeInTheDocument();
    expect(screen.getByText(matchNumber(3200))).toBeInTheDocument();
    expect(screen.getByText(matchNumber(1800))).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
  });

  it('renders category breakdown when categories exist', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockSummary }),
    } as Response);

    render(<BudgetTracker userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
    });

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Housing')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
  });

  it('shows spent percentage in progress bar', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockSummary }),
    } as Response);

    render(<BudgetTracker userId={1} />);

    await waitFor(() => {
      // 3200/5000 = 64%
      expect(screen.getByText('64%')).toBeInTheDocument();
    });
    expect(screen.getByText('Spent')).toBeInTheDocument();
  });

  it('toggles add entry form when button is clicked', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockSummary }),
    } as Response);

    render(<BudgetTracker userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Add Entry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Entry'));

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText('Income', { selector: 'button' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();
  });

  it('switches between expense and income form types', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockSummary }),
    } as Response);

    render(<BudgetTracker userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Add Entry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Entry'));

    // Default is expense — category select should be visible
    expect(screen.getByText('Add Expense')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    // Switch to income
    fireEvent.click(screen.getByText('Income', { selector: 'button' }));
    expect(screen.getByText('Add Income')).toBeInTheDocument();
    // Category select hidden for income
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    render(<BudgetTracker userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load budget data')).toBeInTheDocument();
    });
  });

  it('submits new expense entry and refreshes data', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockSummary }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockSummary }),
      } as Response);

    render(<BudgetTracker userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Add Entry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Entry'));

    const amountInput = screen.getByPlaceholderText('Amount');
    fireEvent.change(amountInput, { target: { value: '500' } });

    fireEvent.click(screen.getByText('Add Expense'));

    await waitFor(() => {
      // POST call for saving entry
      expect(fetchSpy).toHaveBeenCalledWith('/api/finance/budget', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
    });
  });
});
