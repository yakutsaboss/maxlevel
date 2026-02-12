import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Users: ({ className }: any) => <span data-testid="users-icon" className={className} />,
  Star: ({ className }: any) => <span data-testid="star-icon" className={className} />,
  Zap: ({ className }: any) => <span data-testid="zap-icon" className={className} />,
}));

import { FriendsList } from '@/components/social/FriendsList';

const mockFriends = [
  {
    id: 1,
    username: 'alice',
    first_name: 'Alice',
    current_level: 5,
    total_xp: 1200,
    is_active: true,
    friends_since: '2025-01-01',
  },
  {
    id: 2,
    username: null,
    first_name: 'Bob',
    current_level: 3,
    total_xp: 600,
    is_active: false,
    friends_since: '2025-02-15',
  },
];

describe('FriendsList', () => {
  it('shows empty state when no friends', () => {
    render(<FriendsList friends={[]} />);

    expect(screen.getByTestId('users-icon')).toBeInTheDocument();
    expect(screen.getByText('No friends yet. Send a friend request!')).toBeInTheDocument();
  });

  it('renders a list of friends with names', () => {
    render(<FriendsList friends={mockFriends} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('displays username when available', () => {
    render(<FriendsList friends={mockFriends} />);

    expect(screen.getByText('@alice')).toBeInTheDocument();
    // Bob has no username — shouldn't render @null
    expect(screen.queryByText('@null')).not.toBeInTheDocument();
  });

  it('displays level and XP for each friend', () => {
    render(<FriendsList friends={mockFriends} />);

    expect(screen.getByText('Lv.5')).toBeInTheDocument();
    // toLocaleString() formatting varies by environment (comma vs space separator)
    expect(screen.getByText(/1.?200 XP/)).toBeInTheDocument();
    expect(screen.getByText('Lv.3')).toBeInTheDocument();
    expect(screen.getByText('600 XP')).toBeInTheDocument();
  });

  it('shows first letter avatar for each friend', () => {
    render(<FriendsList friends={mockFriends} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
