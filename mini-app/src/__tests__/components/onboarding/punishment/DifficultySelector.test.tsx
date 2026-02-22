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

import { DifficultySelector } from '@/components/onboarding/punishment/DifficultySelector';

describe('DifficultySelector', () => {
  const defaultProps = {
    punishmentType: 'workout' as const,
    difficulty: 'easy' as const,
    safeMode: true,
    onSelectDifficulty: vi.fn(),
    onToggleSafe: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders difficulty options for workout type', () => {
    render(<DifficultySelector {...defaultProps} />);
    // Agent E rebalanced: 3/10/25/50 pushups (was 20/50/100/200)
    expect(screen.getByText('3 pushups')).toBeInTheDocument();
    expect(screen.getByText('10 pushups')).toBeInTheDocument();
    expect(screen.getByText('25 pushups')).toBeInTheDocument();
    expect(screen.getByText('50 pushups')).toBeInTheDocument();
  });

  it('calls onSelectDifficulty when an option is clicked', () => {
    render(<DifficultySelector {...defaultProps} />);
    fireEvent.click(screen.getByText('10 pushups'));
    expect(defaultProps.onSelectDifficulty).toHaveBeenCalledWith('medium');
  });

  it('shows selected state styling for current difficulty', () => {
    render(<DifficultySelector {...defaultProps} difficulty="easy" />);
    const easyButton = screen.getByText('3 pushups').closest('button')!;
    expect(easyButton.className).toContain('border-telegram-button');
  });

  it('renders Safe Mode toggle', () => {
    render(<DifficultySelector {...defaultProps} />);
    expect(screen.getByText('Safe Mode')).toBeInTheDocument();
    expect(screen.getByText('Limits daily losses so you can\'t lose everything')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<DifficultySelector {...defaultProps} />);
    const backButton = screen.getByText(/Change type/);
    fireEvent.click(backButton);
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('renders difficulty options for book type', () => {
    render(<DifficultySelector {...defaultProps} punishmentType="book" />);
    // Agent E rebalanced: 3/10/25/50 pages (was 10/30/50/100)
    expect(screen.getByText('Read 3 pages')).toBeInTheDocument();
    expect(screen.getByText('Read 10 pages')).toBeInTheDocument();
    expect(screen.getByText('Read 25 pages')).toBeInTheDocument();
    expect(screen.getByText('Read 50 pages')).toBeInTheDocument();
  });
});
