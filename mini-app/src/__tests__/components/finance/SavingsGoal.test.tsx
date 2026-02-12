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
  Target: ({ className }: any) => <span data-testid="target-icon" className={className} />,
  PlusCircle: ({ className }: any) => <span data-testid="plus-icon" className={className} />,
  Calendar: ({ className }: any) => <span data-testid="calendar-icon" className={className} />,
  TrendingUp: ({ className }: any) => <span data-testid="trending-up-icon" className={className} />,
  Loader2: ({ className }: any) => <span data-testid="loader-icon" className={className} />,
  Wallet: ({ className }: any) => <span data-testid="wallet-icon" className={className} />,
}));

import { SavingsGoal } from '@/components/finance/SavingsGoal';

// Helper to match locale-formatted numbers (handles both comma and space separators)
const matchNumber = (n: number) => (content: string) => {
  const stripped = content.replace(/[\s,\u00a0]/g, '');
  return stripped === String(n);
};

const mockGoals = [
  {
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
  },
  {
    id: 2,
    name: 'Vacation Trip',
    target_amount: 3000,
    current_amount: 3000,
    created_at: '2025-12-01',
    deposits: [
      { id: 4, amount: 1500, created_at: '2025-12-10' },
      { id: 5, amount: 1500, created_at: '2026-01-10' },
    ],
  },
];

describe('SavingsGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('shows loading spinner initially', () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

    render(<SavingsGoal userId={1} />);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('renders empty state when no goals exist', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true, data: { goals: [] } }),
    } as Response);

    render(<SavingsGoal userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('No savings goals yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Create your first goal to start saving!')).toBeInTheDocument();
  });

  it('renders goals with progress after loading', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true, data: { goals: mockGoals } }),
    } as Response);

    render(<SavingsGoal userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    });

    expect(screen.getByText('Vacation Trip')).toBeInTheDocument();
    // Progress: 4500/10000 = 45%
    expect(screen.getByText('45%')).toBeInTheDocument();
    // Completed goal: 3000/3000 = 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
    // Goal count header
    expect(screen.getByText('2 goals')).toBeInTheDocument();
  });

  it('displays amount progress for each goal', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true, data: { goals: mockGoals } }),
    } as Response);

    render(<SavingsGoal userId={1} />);

    await waitFor(() => {
      // The amounts are rendered with toLocaleString, text may span child nodes
      expect(screen.getByText((_content, element) => {
        const text = element?.textContent?.replace(/[\s\u00a0]/g, '') ?? '';
        return text === '4,500/10,000' || text === '4500/10000';
      })).toBeInTheDocument();
    });
    expect(screen.getByText((_content, element) => {
      const text = element?.textContent?.replace(/[\s\u00a0]/g, '') ?? '';
      return text === '3,000/3,000' || text === '3000/3000';
    })).toBeInTheDocument();
  });

  it('shows "Completed!" projection for finished goals', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true, data: { goals: mockGoals } }),
    } as Response);

    render(<SavingsGoal userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Projected: Completed!')).toBeInTheDocument();
    });
  });

  it('shows recent deposits for goals with deposit history', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true, data: { goals: mockGoals } }),
    } as Response);

    render(<SavingsGoal userId={1} />);

    await waitFor(() => {
      expect(screen.getAllByText('Recent deposits').length).toBeGreaterThanOrEqual(1);
    });

    // Deposit amounts displayed with + prefix (text may be split across nodes)
    const depositSpans = screen.getAllByText((_content, element) => {
      const text = element?.textContent?.replace(/[\s\u00a0]/g, '') ?? '';
      return text.startsWith('+') && /^\+\d+$/.test(text);
    });
    expect(depositSpans.length).toBeGreaterThanOrEqual(3);
  });

  it('toggles new goal form when button is clicked', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true, data: { goals: [] } }),
    } as Response);

    render(<SavingsGoal userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('New Savings Goal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Savings Goal'));

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Goal name (e.g., Emergency Fund)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Target amount')).toBeInTheDocument();
    expect(screen.getByText('Create Goal')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    render(<SavingsGoal userId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load savings goals')).toBeInTheDocument();
    });
  });
});
