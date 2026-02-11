import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserAvatar } from '@/components/leaderboard/UserAvatar';

describe('UserAvatar', () => {
  it('renders first letter of firstName as fallback', () => {
    render(<UserAvatar userId={1} firstName="Alice" />);

    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('falls back to username initial when firstName is missing', () => {
    render(<UserAvatar userId={2} username="bob_123" />);

    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('shows "?" when both firstName and username are missing', () => {
    render(<UserAvatar userId={3} />);

    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
