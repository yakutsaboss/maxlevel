import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
  Info: () => <span data-testid="info-icon" />,
  BookOpen: () => <span data-testid="book-icon" />,
  Bug: () => <span data-testid="bug-icon" />,
}));

import { AboutSection } from '@/components/settings/AboutSection';

describe('AboutSection', () => {
  const mockOnOpenTelegramLink = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders app version', () => {
    render(<AboutSection onOpenTelegramLink={mockOnOpenTelegramLink} />);

    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
  });

  it('renders about text and link buttons', () => {
    render(<AboutSection onOpenTelegramLink={mockOnOpenTelegramLink} />);

    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('Report a bug')).toBeInTheDocument();
  });

  it('clicking links calls onOpenTelegramLink', () => {
    render(<AboutSection onOpenTelegramLink={mockOnOpenTelegramLink} />);

    fireEvent.click(screen.getByText('How it works'));
    expect(mockOnOpenTelegramLink).toHaveBeenCalledWith('https://t.me/maxlevelapp');

    fireEvent.click(screen.getByText('Report a bug'));
    expect(mockOnOpenTelegramLink).toHaveBeenCalledTimes(2);
  });
});
