import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  WifiOff: (props: any) => <span data-testid="wifi-off-icon" {...props} />,
  RefreshCw: (props: any) => <span data-testid="refresh-icon" {...props} />,
  Wifi: (props: any) => <span data-testid="wifi-icon" {...props} />,
}));

// Mock useServiceWorker — default: online
const mockUseServiceWorker = vi.fn();
vi.mock('@/hooks/useServiceWorker', () => ({
  useServiceWorker: (...args: unknown[]) => mockUseServiceWorker(...args),
}));

import { OfflineBanner } from '@/components/OfflineBanner';

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseServiceWorker.mockReturnValue({
      isOffline: false,
      isUpdateAvailable: false,
      updateServiceWorker: vi.fn(),
    });
  });

  it('does not render when online', () => {
    mockUseServiceWorker.mockReturnValue({
      isOffline: false,
      isUpdateAvailable: false,
      updateServiceWorker: vi.fn(),
    });
    const { container } = render(<OfflineBanner />);
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="wifi-off-icon"]')).toBeNull();
  });

  it('renders banner when offline', () => {
    mockUseServiceWorker.mockReturnValue({
      isOffline: true,
      isUpdateAvailable: false,
      updateServiceWorker: vi.fn(),
    });
    render(<OfflineBanner />);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
  });

  it('shows unavailable features warning', () => {
    mockUseServiceWorker.mockReturnValue({
      isOffline: true,
      isUpdateAvailable: false,
      updateServiceWorker: vi.fn(),
    });
    render(<OfflineBanner />);
    expect(screen.getByText(/some features may be unavailable/i)).toBeInTheDocument();
  });

  it('hides banner when going back online', () => {
    const { rerender } = render(<OfflineBanner />);

    // Start offline
    mockUseServiceWorker.mockReturnValue({
      isOffline: true,
      isUpdateAvailable: false,
      updateServiceWorker: vi.fn(),
    });
    rerender(<OfflineBanner />);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();

    // Go back online
    mockUseServiceWorker.mockReturnValue({
      isOffline: false,
      isUpdateAvailable: false,
      updateServiceWorker: vi.fn(),
    });
    rerender(<OfflineBanner />);
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
  });
});
