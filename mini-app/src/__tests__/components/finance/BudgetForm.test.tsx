import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
  PlusCircle: ({ className }: any) => <span data-testid="plus-icon" className={className} />,
}));

import { BudgetForm } from '@/components/finance/BudgetForm';

describe('BudgetForm', () => {
  const defaultProps = {
    submitting: false,
    onSubmit: vi.fn().mockResolvedValue(true),
  };

  it('renders the toggle button with "Add Entry" text', () => {
    render(<BudgetForm {...defaultProps} />);

    expect(screen.getByText('Add Entry')).toBeInTheDocument();
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  it('toggles form visibility and shows "Cancel" when open', () => {
    render(<BudgetForm {...defaultProps} />);

    fireEvent.click(screen.getByText('Add Entry'));

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Expense')).toBeInTheDocument();
  });

  it('shows category select for expense and hides it for income', () => {
    render(<BudgetForm {...defaultProps} />);

    fireEvent.click(screen.getByText('Add Entry'));

    // Default is expense — category select visible
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    // Switch to income — category select hidden
    fireEvent.click(screen.getByText('Income', { selector: 'button' }));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('disables submit button when amount is empty', () => {
    render(<BudgetForm {...defaultProps} />);

    fireEvent.click(screen.getByText('Add Entry'));

    const submitBtn = screen.getByText('Add Expense');
    expect(submitBtn).toBeDisabled();
  });

  it('disables submit button when submitting is true', () => {
    render(<BudgetForm {...defaultProps} submitting={true} />);

    fireEvent.click(screen.getByText('Add Entry'));

    const amountInput = screen.getByPlaceholderText('Amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  it('changes submit label based on form type', () => {
    render(<BudgetForm {...defaultProps} />);

    fireEvent.click(screen.getByText('Add Entry'));

    const amountInput = screen.getByPlaceholderText('Amount');
    fireEvent.change(amountInput, { target: { value: '50' } });

    expect(screen.getByText('Add Expense')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Income', { selector: 'button' }));

    expect(screen.getByText('Add Income')).toBeInTheDocument();
  });
});
