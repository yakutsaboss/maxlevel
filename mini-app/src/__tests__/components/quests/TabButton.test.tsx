import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabButton } from '@/components/quests/TabButton';

describe('TabButton', () => {
  const defaultProps = {
    active: false,
    onClick: vi.fn(),
    icon: <span data-testid="tab-icon">📋</span>,
    label: 'Active',
    count: 5,
  };

  it('renders tab label and count', () => {
    render(<TabButton {...defaultProps} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByTestId('tab-icon')).toBeInTheDocument();
  });

  it('applies active styling when active is true', () => {
    const { container } = render(<TabButton {...defaultProps} active={true} />);

    const button = container.querySelector('button');
    expect(button?.className).toContain('bg-white');
    expect(button?.className).toContain('text-blue-600');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<TabButton {...defaultProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
