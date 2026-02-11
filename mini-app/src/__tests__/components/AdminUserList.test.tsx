import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className, ...props }: any) => (
      <div onClick={onClick} className={className}>{children}</div>
    ),
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className}>{children}</button>
    ),
  },
}));

// Mock adminClient
vi.mock('@/api/adminClient', () => ({
  API_BASE_URL: 'http://localhost:3000/api',
}));

import { AdminUserList } from '@/components/AdminUserList';

const mockUsers = [
  {
    id: 1,
    telegram_id: 111,
    display_name: 'Alice',
    xp: 500,
    level: 5,
    active_modes: ['fitness'],
    last_active: '2026-01-15T10:00:00Z',
  },
  {
    id: 2,
    telegram_id: 222,
    display_name: 'Bob',
    xp: 300,
    level: 3,
    active_modes: ['learning', 'health'],
    last_active: '2026-01-14T10:00:00Z',
  },
  {
    id: 3,
    telegram_id: 333,
    display_name: 'Charlie',
    xp: 100,
    level: 1,
    active_modes: [],
    last_active: '2026-01-13T10:00:00Z',
  },
];

describe('AdminUserList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders user list after loading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { users: mockUsers, total: 3 } }),
    } as Response);

    render(<AdminUserList credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('shows user XP and level info', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { users: mockUsers, total: 3 } }),
    } as Response);

    render(<AdminUserList credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText(/Lv\.5/)).toBeInTheDocument();
      expect(screen.getByText(/500/)).toBeInTheDocument();
    });
  });

  it('search filters users by name', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { users: mockUsers, total: 3 } }),
    } as Response);

    render(<AdminUserList credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by name or ID...');
    fireEvent.change(searchInput, { target: { value: 'Bob' } });

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
  });

  it('handles empty user list', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { users: [], total: 0 } }),
    } as Response);

    render(<AdminUserList credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText('No users yet')).toBeInTheDocument();
    });
  });

  it('shows "No users found" when search has no results', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { users: mockUsers, total: 3 } }),
    } as Response);

    render(<AdminUserList credentials="dGVzdDp0ZXN0" />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by name or ID...');
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });
});
