import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: (props: any) => <span data-testid="search-icon" {...props} />,
}));

import { AdminUserSearch } from '@/components/AdminUserSearch';

describe('AdminUserSearch', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<AdminUserSearch {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search by name or ID...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('displays the controlled value', () => {
    render(<AdminUserSearch {...defaultProps} value="Alice" />);

    const input = screen.getByPlaceholderText('Search by name or ID...');
    expect(input).toHaveValue('Alice');
  });

  it('calls onChange when user types', () => {
    const onChange = vi.fn();
    render(<AdminUserSearch {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Search by name or ID...');
    fireEvent.change(input, { target: { value: 'Bob' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('Bob');
  });
});
