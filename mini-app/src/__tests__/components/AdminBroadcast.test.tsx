import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  Send: (props: any) => <span data-testid="send-icon" {...props} />,
  AlertTriangle: (props: any) => <span data-testid="alert-icon" {...props} />,
  CheckCircle: (props: any) => <span data-testid="check-icon" {...props} />,
  AlertCircle: (props: any) => <span data-testid="alert-circle-icon" {...props} />,
  Info: (props: any) => <span data-testid="info-icon" {...props} />,
  X: (props: any) => <span data-testid="x-icon" {...props} />,
}));

vi.mock('@/api/adminClient', () => ({
  API_BASE_URL: 'http://test-api',
}));

import { AdminBroadcast } from '@/components/AdminBroadcast';

describe('AdminBroadcast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders message textarea and send button', () => {
    render(<AdminBroadcast credentials="dGVzdA==" />);
    expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send broadcast/i })).toBeInTheDocument();
    expect(screen.getByText('0/4096')).toBeInTheDocument();
  });

  it('shows character count as user types', () => {
    render(<AdminBroadcast credentials="dGVzdA==" />);
    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'Hello everyone!' } });
    expect(screen.getByText('15/4096')).toBeInTheDocument();
  });

  it('send button calls API on confirmation', async () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { sent: 10, failed: 0 } }),
    } as Response);

    render(<AdminBroadcast credentials="dGVzdA==" />);
    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'Test broadcast' } });
    fireEvent.click(screen.getByRole('button', { name: /send broadcast/i }));

    expect(mockConfirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api/admin/broadcast',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Test broadcast' }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Broadcast sent: 10 delivered/)).toBeInTheDocument();
    });
  });

  it('shows error toast on network failure', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    render(<AdminBroadcast credentials="dGVzdA==" />);
    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: /send broadcast/i }));

    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });
});
