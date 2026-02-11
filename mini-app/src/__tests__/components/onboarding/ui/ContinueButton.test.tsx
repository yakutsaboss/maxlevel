import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className}>{children}</button>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className}>{children}</p>
    ),
  },
}));

import { ContinueButton } from '@/components/onboarding/ui/ContinueButton';

describe('ContinueButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders button with default label', () => {
    render(<ContinueButton onClick={mockOnClick} />);
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('renders button with custom label', () => {
    render(<ContinueButton onClick={mockOnClick} label="Next Step" />);
    expect(screen.getByText('Next Step')).toBeInTheDocument();
  });

  it('calls onClick when clicked and not disabled', () => {
    render(<ContinueButton onClick={mockOnClick} />);
    fireEvent.click(screen.getByText('Continue'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    render(<ContinueButton onClick={mockOnClick} disabled />);
    fireEvent.click(screen.getByText('Continue'));
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('shows hint text when disabled button is clicked', () => {
    render(<ContinueButton onClick={mockOnClick} disabled />);
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Please make a selection')).toBeInTheDocument();
  });
});
