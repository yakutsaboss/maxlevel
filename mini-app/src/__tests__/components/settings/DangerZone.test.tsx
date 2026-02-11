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
  Trash2: ({ className }: any) => <span data-testid="trash-icon" className={className} />,
  Loader2: ({ className }: any) => <span data-testid="loader-icon" className={className} />,
}));

import { DangerZone } from '@/components/settings/DangerZone';

describe('DangerZone', () => {
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders delete account button', () => {
    render(<DangerZone deleting={false} onDelete={mockOnDelete} />);

    expect(screen.getByText('Delete Account', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
    expect(screen.getByText('Permanently remove your account and all data')).toBeInTheDocument();
  });

  it('calls onDelete callback when button is clicked', () => {
    render(<DangerZone deleting={false} onDelete={mockOnDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when deleting', () => {
    render(<DangerZone deleting={true} onDelete={mockOnDelete} />);

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('disables button when deleting', () => {
    render(<DangerZone deleting={true} onDelete={mockOnDelete} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('button has red warning styling', () => {
    render(<DangerZone deleting={false} onDelete={mockOnDelete} />);

    const button = screen.getByRole('button', { name: /delete account/i });
    expect(button.className).toContain('border-red-500');
    expect(button.className).toContain('text-red-500');
  });
});