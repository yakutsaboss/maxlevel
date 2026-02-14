/**
 * Tests for FriendRequestForm (mini-app/src/components/social/FriendRequestForm.tsx)
 *
 * Rewritten by Agent 0 (Run 63) after Agent B rewrote the component
 * from numeric Telegram ID input to username-based search.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock @/api/social — searchUsers
const mockSearchUsers = vi.fn();
vi.mock('@/api/social', () => ({
  searchUsers: (...args: unknown[]) => mockSearchUsers(...args),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Search: ({ className }: any) => <span data-testid="search-icon" className={className} />,
  Send: ({ className }: any) => <span data-testid="send-icon" className={className} />,
  Loader2: ({ className }: any) => <span data-testid="loader-icon" className={className} />,
  UserPlus: ({ className }: any) => <span data-testid="user-plus-icon" className={className} />,
}));

import { FriendRequestForm } from '@/components/social/FriendRequestForm';

describe('FriendRequestForm', () => {
  const mockHaptic = { notification: vi.fn() };
  const defaultProps = {
    userId: 1,
    onSuccess: vi.fn(),
    haptic: mockHaptic,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<FriendRequestForm {...defaultProps} />);

    expect(screen.getByText('Search for friends')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Search by username or name...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('does not search when query is shorter than 2 characters', async () => {
    render(<FriendRequestForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Search by username or name...'), {
      target: { value: 'a' },
    });

    // Wait past debounce
    await new Promise(r => setTimeout(r, 400));

    expect(mockSearchUsers).not.toHaveBeenCalled();
  });

  it('searches after debounce when query is >= 2 chars', async () => {
    mockSearchUsers.mockResolvedValue([
      { id: 2, username: 'alice', first_name: 'Alice', current_level: 5, total_xp: 2500 },
    ]);

    render(<FriendRequestForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Search by username or name...'), {
      target: { value: 'ali' },
    });

    await waitFor(() => {
      expect(mockSearchUsers).toHaveBeenCalledWith('ali');
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
  });

  it('filters out the current user from results', async () => {
    mockSearchUsers.mockResolvedValue([
      { id: 1, username: 'self', first_name: 'Self', current_level: 1, total_xp: 100 },
      { id: 2, username: 'alice', first_name: 'Alice', current_level: 5, total_xp: 2500 },
    ]);

    render(<FriendRequestForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Search by username or name...'), {
      target: { value: 'test' },
    });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.queryByText('Self')).not.toBeInTheDocument();
  });

  it('shows "No users found" when search returns empty', async () => {
    mockSearchUsers.mockResolvedValue([]);

    render(<FriendRequestForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Search by username or name...'), {
      target: { value: 'zzz' },
    });

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('sends friend request on button click and shows success', async () => {
    mockSearchUsers.mockResolvedValue([
      { id: 2, username: 'alice', first_name: 'Alice', current_level: 5, total_xp: 2500 },
    ]);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true }),
    } as Response);

    render(<FriendRequestForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Search by username or name...'), {
      target: { value: 'ali' },
    });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Click the send button for Alice's result card
    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons.find(b => b.className.includes('bg-telegram-link'));
    fireEvent.click(sendBtn!);

    await waitFor(() => {
      expect(mockHaptic.notification).toHaveBeenCalledWith('success');
    });
  });

  it('shows error message on API failure', async () => {
    mockSearchUsers.mockResolvedValue([
      { id: 2, username: 'alice', first_name: 'Alice', current_level: 5, total_xp: 2500 },
    ]);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: false, message: 'Already friends' }),
    } as Response);

    render(<FriendRequestForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Search by username or name...'), {
      target: { value: 'ali' },
    });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons.find(b => b.className.includes('bg-telegram-link'));
    fireEvent.click(sendBtn!);

    await waitFor(() => {
      expect(screen.getByText('Already friends')).toBeInTheDocument();
    });
  });
});
