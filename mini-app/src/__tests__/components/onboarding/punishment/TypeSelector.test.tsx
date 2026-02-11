import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className}>{children}</button>
    ),
  },
}));

import { TypeSelector } from '@/components/onboarding/punishment/TypeSelector';

describe('TypeSelector', () => {
  const defaultProps = {
    punishmentType: null as any,
    onSelectType: vi.fn(),
    onNext: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all punishment type options', () => {
    render(<TypeSelector {...defaultProps} />);
    expect(screen.getByText('Choose your punishment type')).toBeInTheDocument();
    expect(screen.getByText('Workout')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('Money')).toBeInTheDocument();
  });

  it('renders taglines for each type', () => {
    render(<TypeSelector {...defaultProps} />);
    expect(screen.getByText('Missed a task? Drop and give me pushups!')).toBeInTheDocument();
    expect(screen.getByText('Skipped your goal? Time to read.')).toBeInTheDocument();
    expect(screen.getByText('Failed today? Donate to a good cause.')).toBeInTheDocument();
  });

  it('calls onSelectType when a type is clicked', () => {
    render(<TypeSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('Workout'));
    expect(defaultProps.onSelectType).toHaveBeenCalledWith('workout');
  });

  it('shows Next button when a type is selected', () => {
    render(<TypeSelector {...defaultProps} punishmentType="workout" />);
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('does not show Next button when no type is selected', () => {
    render(<TypeSelector {...defaultProps} punishmentType={null} />);
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });

  it('calls onNext when Next button is clicked', () => {
    render(<TypeSelector {...defaultProps} punishmentType="book" />);
    fireEvent.click(screen.getByText('Next'));
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });
});
