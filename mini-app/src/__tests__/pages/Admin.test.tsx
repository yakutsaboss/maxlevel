import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Admin } from '@/pages/Admin';

// Mock adminFetch
const mockAdminFetch = vi.fn();
vi.mock('@/api/adminClient', () => ({
  adminFetch: (...args: unknown[]) => mockAdminFetch(...args),
  API_BASE_URL: 'http://localhost:3000/api',
}));

// Mock child components to isolate Admin page logic
vi.mock('@/components/admin/AdminLoginForm', () => ({
  AdminLoginForm: ({ onLoginSuccess }: any) => (
    <div>
      <span>Admin Panel</span>
      <span>Enter your admin credentials</span>
      <input placeholder="Username" data-testid="username" onChange={() => {}} />
      <input placeholder="Password" data-testid="password" onChange={() => {}} />
      <button onClick={() => {
        const mockStats = { total_users: 10, active_users_7d: 5, total_quests_completed: 20, total_achievements_unlocked: 3 };
        onLoginSuccess(btoa('admin:pass'), mockStats);
      }}>Login</button>
    </div>
  ),
}));

vi.mock('@/components/admin/AdminOverview', () => ({
  AdminOverview: ({ stats }: { stats: unknown }) => (
    <div data-testid="admin-stats-card">Stats: {stats ? 'loaded' : 'null'}</div>
  ),
}));

vi.mock('@/components/AdminUserList', () => ({
  AdminUserList: () => <div data-testid="admin-user-list">User List</div>,
}));

vi.mock('@/components/AdminBroadcast', () => ({
  AdminBroadcast: () => <div data-testid="admin-broadcast">Broadcast</div>,
}));

vi.mock('@/components/AdminJobs', () => ({
  AdminJobs: () => <div data-testid="admin-jobs">Jobs Panel</div>,
}));

vi.mock('@/components/AdminLogs', () => ({
  AdminLogs: () => <div data-testid="admin-logs">Logs Panel</div>,
}));

vi.mock('@/components/Toast', () => ({
  Toast: ({ message }: { message: string }) => <div data-testid="toast">{message}</div>,
}));

describe('Admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders login form when not authenticated', () => {
    render(<Admin />);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Enter your admin credentials')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  // "shows error toast on invalid credentials" removed — error handling
  // lives inside AdminLoginForm (mocked), not the Admin page component.

  it('authenticates and renders admin dashboard with tabs', async () => {
    const mockStats = { total_users: 100, active_users_7d: 50, total_quests_completed: 200, total_achievements_unlocked: 30 };
    mockAdminFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ data: mockStats }),
    });

    render(<Admin />);

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // All tabs should be visible
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Broadcast')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();

    // Stats card should be rendered by default (Overview tab)
    expect(screen.getByTestId('admin-stats-card')).toBeInTheDocument();
  });

  it('switches tabs to render correct components', async () => {
    const mockStats = { total_users: 10, active_users_7d: 5, total_quests_completed: 20, total_achievements_unlocked: 3 };
    mockAdminFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ data: mockStats }),
    });

    render(<Admin />);

    // Login
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // Switch to Users tab
    fireEvent.click(screen.getByText('Users'));
    expect(screen.getByTestId('admin-user-list')).toBeInTheDocument();

    // Switch to Jobs tab
    fireEvent.click(screen.getByText('Jobs'));
    expect(screen.getByTestId('admin-jobs')).toBeInTheDocument();

    // Switch to Logs tab
    fireEvent.click(screen.getByText('Logs'));
    expect(screen.getByTestId('admin-logs')).toBeInTheDocument();
  });

  it('restores authentication from sessionStorage', async () => {
    const mockStats = { total_users: 10, active_users_7d: 5, total_quests_completed: 20, total_achievements_unlocked: 3 };
    mockAdminFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ data: mockStats }),
    });

    // Pre-set credentials in sessionStorage
    sessionStorage.setItem('admin_credentials', btoa('admin:pass'));

    render(<Admin />);

    // Should skip login and go straight to dashboard
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText('Username')).not.toBeInTheDocument();
  });

  it('logs out and returns to login form', async () => {
    const mockStats = { total_users: 10, active_users_7d: 5, total_quests_completed: 20, total_achievements_unlocked: 3 };
    mockAdminFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ data: mockStats }),
    });

    // Pre-authenticate
    sessionStorage.setItem('admin_credentials', btoa('admin:pass'));
    render(<Admin />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // Click logout
    fireEvent.click(screen.getByText('Logout'));

    // Should return to login form
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(sessionStorage.getItem('admin_credentials')).toBeNull();
  });
});
