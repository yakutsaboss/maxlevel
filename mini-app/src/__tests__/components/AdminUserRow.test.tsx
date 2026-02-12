import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  User: (props: any) => <span data-testid="user-icon" {...props} />,
}));

import { AdminUserRow } from '@/components/AdminUserRow';

const mockUser = {
  display_name: 'Alice',
  level: 5,
  xp: 1500,
  active_modes: ['fitness', 'hydration'],
  last_active: '2026-02-10T12:00:00Z',
};

describe('AdminUserRow', () => {
  const defaultProps = {
    user: mockUser,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user display name', () => {
    render(<AdminUserRow {...defaultProps} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders level and XP info', () => {
    render(<AdminUserRow {...defaultProps} />);

    expect(screen.getByText(/Lv\.5/)).toBeInTheDocument();
    // toLocaleString output varies by locale (e.g. "1,500" vs "1 500")
    expect(screen.getByText(/1.500 XP/)).toBeInTheDocument();
  });

  it('calls onClick when row is clicked', () => {
    const onClick = vi.fn();
    render(<AdminUserRow {...defaultProps} onClick={onClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
