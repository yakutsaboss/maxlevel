import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  Download: (props: any) => <span data-testid="download-icon" {...props} />,
  X: (props: any) => <span data-testid="x-icon" {...props} />,
}));

// Mock useTelegram
const mockHaptic = {
  impact: vi.fn(),
  notification: vi.fn(),
  selection: vi.fn(),
};
vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({ haptic: mockHaptic }),
}));

import { InstallPrompt } from '@/components/InstallPrompt';

describe('InstallPrompt', () => {
  let addEventSpy: ReturnType<typeof vi.spyOn>;
  let removeEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    addEventSpy = vi.spyOn(window, 'addEventListener');
    removeEventSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventSpy.mockRestore();
    removeEventSpy.mockRestore();
  });

  it('does not show prompt initially (no beforeinstallprompt event)', () => {
    render(<InstallPrompt />);
    expect(screen.queryByText(/add maxlevel/i)).not.toBeInTheDocument();
  });

  it('shows prompt when beforeinstallprompt fires', () => {
    render(<InstallPrompt />);

    // Find the handler registered for 'beforeinstallprompt'
    const call = addEventSpy.mock.calls.find(c => c[0] === 'beforeinstallprompt');
    expect(call).toBeDefined();
    const handler = call![1] as EventListener;

    // Fire the event
    const mockEvent = new Event('beforeinstallprompt');
    Object.defineProperty(mockEvent, 'preventDefault', { value: vi.fn() });
    (mockEvent as any).prompt = vi.fn().mockResolvedValue(undefined);
    (mockEvent as any).userChoice = Promise.resolve({ outcome: 'dismissed' });

    act(() => {
      handler(mockEvent);
    });

    expect(screen.getByText(/add maxlevel to your home screen/i)).toBeInTheDocument();
    expect(screen.getByText('Install')).toBeInTheDocument();
  });

  it('dismiss button hides prompt and persists to localStorage', () => {
    render(<InstallPrompt />);

    // Trigger beforeinstallprompt
    const call = addEventSpy.mock.calls.find(c => c[0] === 'beforeinstallprompt');
    const handler = call![1] as EventListener;
    const mockEvent = new Event('beforeinstallprompt');
    Object.defineProperty(mockEvent, 'preventDefault', { value: vi.fn() });
    (mockEvent as any).prompt = vi.fn();
    (mockEvent as any).userChoice = Promise.resolve({ outcome: 'dismissed' });

    act(() => {
      handler(mockEvent);
    });

    expect(screen.getByText(/add maxlevel/i)).toBeInTheDocument();

    // Click dismiss (the X button)
    const dismissBtn = screen.getByTestId('x-icon').closest('button')!;
    fireEvent.click(dismissBtn);

    expect(screen.queryByText(/add maxlevel/i)).not.toBeInTheDocument();
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'install_prompt_dismissed',
      expect.any(String),
    );
    expect(mockHaptic.impact).toHaveBeenCalledWith('light');
  });

  it('does not show prompt if dismissed within 7 days', () => {
    // Set dismissal to 1 day ago
    const oneDayAgo = String(Date.now() - 1 * 24 * 60 * 60 * 1000);
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(oneDayAgo);

    render(<InstallPrompt />);

    // The effect should check localStorage and return early,
    // so no 'beforeinstallprompt' listener should be registered
    const call = addEventSpy.mock.calls.find(c => c[0] === 'beforeinstallprompt');
    expect(call).toBeUndefined();
  });

  it('shows prompt if dismissal is older than 7 days', () => {
    // Set dismissal to 8 days ago
    const eightDaysAgo = String(Date.now() - 8 * 24 * 60 * 60 * 1000);
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(eightDaysAgo);

    render(<InstallPrompt />);

    // Should still register the listener because dismissal expired
    const call = addEventSpy.mock.calls.find(c => c[0] === 'beforeinstallprompt');
    expect(call).toBeDefined();
  });

  it('install button triggers prompt and provides haptic feedback', async () => {
    render(<InstallPrompt />);

    const call = addEventSpy.mock.calls.find(c => c[0] === 'beforeinstallprompt');
    const handler = call![1] as EventListener;
    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const mockEvent = new Event('beforeinstallprompt');
    Object.defineProperty(mockEvent, 'preventDefault', { value: vi.fn() });
    (mockEvent as any).prompt = mockPrompt;
    (mockEvent as any).userChoice = Promise.resolve({ outcome: 'accepted' });

    act(() => {
      handler(mockEvent);
    });

    const installBtn = screen.getByText('Install');
    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(mockHaptic.impact).toHaveBeenCalledWith('medium');
    expect(mockPrompt).toHaveBeenCalled();
    // On accepted, should give success notification
    expect(mockHaptic.notification).toHaveBeenCalledWith('success');
    // Should hide prompt after install
    expect(screen.queryByText(/add maxlevel/i)).not.toBeInTheDocument();
  });
});
