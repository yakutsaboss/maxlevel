import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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

import { GoalContribution } from '@/components/finance/GoalContribution';

const defaultProps = {
  goalId: 1,
  isOpen: true,
  submitting: false,
  onDeposit: vi.fn().mockResolvedValue(true),
};

describe('GoalContribution', () => {
  it('renders input and button when isOpen is true', () => {
    render(<GoalContribution {...defaultProps} />);

    expect(screen.getByPlaceholderText('Deposit amount')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <GoalContribution {...defaultProps} isOpen={false} />,
    );

    expect(screen.queryByPlaceholderText('Deposit amount')).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });

  it('disables Add button when input is empty', () => {
    render(<GoalContribution {...defaultProps} />);

    expect(screen.getByText('Add')).toBeDisabled();
  });

  it('enables Add button when amount is entered', () => {
    render(<GoalContribution {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Deposit amount'), {
      target: { value: '500' },
    });

    expect(screen.getByText('Add')).not.toBeDisabled();
  });

  it('calls onDeposit with goalId and parsed amount on click', async () => {
    const onDeposit = vi.fn().mockResolvedValue(true);
    render(<GoalContribution {...defaultProps} onDeposit={onDeposit} />);

    fireEvent.change(screen.getByPlaceholderText('Deposit amount'), {
      target: { value: '250.50' },
    });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(onDeposit).toHaveBeenCalledWith(1, 250.5);
    });
  });

  it('clears input after successful deposit', async () => {
    const onDeposit = vi.fn().mockResolvedValue(true);
    render(<GoalContribution {...defaultProps} onDeposit={onDeposit} />);

    const input = screen.getByPlaceholderText('Deposit amount');
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(input).toHaveValue(null);
    });
  });

  it('keeps input value after failed deposit', async () => {
    const onDeposit = vi.fn().mockResolvedValue(false);
    render(<GoalContribution {...defaultProps} onDeposit={onDeposit} />);

    const input = screen.getByPlaceholderText('Deposit amount');
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(onDeposit).toHaveBeenCalled();
    });
    expect(input).toHaveValue(100);
  });

  it('does not call onDeposit for zero or negative amounts', () => {
    const onDeposit = vi.fn();
    render(<GoalContribution {...defaultProps} onDeposit={onDeposit} />);

    fireEvent.change(screen.getByPlaceholderText('Deposit amount'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByText('Add'));

    expect(onDeposit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('Deposit amount'), {
      target: { value: '-5' },
    });
    fireEvent.click(screen.getByText('Add'));

    expect(onDeposit).not.toHaveBeenCalled();
  });

  it('shows "..." text and disables button when submitting', () => {
    render(<GoalContribution {...defaultProps} submitting={true} />);

    fireEvent.change(screen.getByPlaceholderText('Deposit amount'), {
      target: { value: '100' },
    });

    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeDisabled();
  });
});
