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

import { GoalForm } from '@/components/finance/GoalForm';

describe('GoalForm', () => {
  const defaultProps = {
    submitting: false,
    onCreateGoal: vi.fn().mockResolvedValue(true),
  };

  it('renders toggle button with "New Savings Goal" text', () => {
    render(<GoalForm {...defaultProps} />);

    expect(screen.getByText('New Savings Goal')).toBeInTheDocument();
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  it('toggles form visibility and shows input fields', () => {
    render(<GoalForm {...defaultProps} />);

    fireEvent.click(screen.getByText('New Savings Goal'));

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Goal name (e.g., Emergency Fund)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Target amount')).toBeInTheDocument();
    expect(screen.getByText('Create Goal')).toBeInTheDocument();
  });

  it('disables submit when goal name is empty', () => {
    render(<GoalForm {...defaultProps} />);

    fireEvent.click(screen.getByText('New Savings Goal'));

    // Only set amount, leave name empty
    const amountInput = screen.getByPlaceholderText('Target amount');
    fireEvent.change(amountInput, { target: { value: '1000' } });

    expect(screen.getByText('Create Goal')).toBeDisabled();
  });

  it('disables submit when target amount is empty', () => {
    render(<GoalForm {...defaultProps} />);

    fireEvent.click(screen.getByText('New Savings Goal'));

    // Only set name, leave amount empty
    const nameInput = screen.getByPlaceholderText('Goal name (e.g., Emergency Fund)');
    fireEvent.change(nameInput, { target: { value: 'My Goal' } });

    expect(screen.getByText('Create Goal')).toBeDisabled();
  });

  it('shows "Creating..." text when submitting', () => {
    render(<GoalForm {...defaultProps} submitting={true} />);

    fireEvent.click(screen.getByText('New Savings Goal'));

    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByText('Creating...')).toBeDisabled();
  });
});
