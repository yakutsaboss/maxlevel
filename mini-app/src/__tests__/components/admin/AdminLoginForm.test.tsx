import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  Shield: (props: any) => <span data-testid="shield-icon" {...props} />,
  LogIn: (props: any) => <span data-testid="login-icon" {...props} />,
}));

vi.mock('@/components/Toast', () => ({
  Toast: ({ message, variant }: { message: string; variant: string }) => (
    <div data-testid="toast" data-variant={variant}>{message}</div>
  ),
}));

const mockAdminFetch = vi.fn();
vi.mock('@/api/adminClient', () => ({
  adminFetch: (...args: unknown[]) => mockAdminFetch(...args),
}));

import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

describe('AdminLoginForm', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form inputs', () => {
    render(<AdminLoginForm onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Enter your admin credentials')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
    expect(screen.getByTestId('login-icon')).toBeInTheDocument();
  });

  it('shows loading state on submit', async () => {
    // Never-resolving promise to keep loading state
    mockAdminFetch.mockReturnValue(new Promise(() => {}));

    render(<AdminLoginForm onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      // Login icon should be replaced by spinner, button should be disabled
      expect(screen.queryByTestId('login-icon')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  it('displays error toast on failure', async () => {
    mockAdminFetch.mockResolvedValue({ status: 401, ok: false });

    render(<AdminLoginForm onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('Invalid credentials');
    });

    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it('calls onLoginSuccess on success', async () => {
    const mockStats = {
      total_users: 100,
      active_users_7d: 50,
      total_quests_completed: 200,
      total_achievements_unlocked: 30,
    };
    mockAdminFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ data: mockStats }),
    });

    render(<AdminLoginForm onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(
        btoa('admin:secret'),
        mockStats,
      );
    });
  });
});
