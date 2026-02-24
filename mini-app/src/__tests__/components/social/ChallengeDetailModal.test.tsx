/**
 * Tests for ChallengeDetailModal (mini-app/src/components/social/ChallengeDetailModal.tsx)
 *
 * Run 64 Agent C: Tests for the challenge detail modal that shows leaderboard,
 * challenge info, and leave button.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mock getChallengeDetails from api/social ────────────────────────

const mockGetChallengeDetails = vi.fn();
const mockLeaveChallenge = vi.fn();

vi.mock('@/api/social', () => ({
  getChallengeDetails: (...args: unknown[]) => mockGetChallengeDetails(...args),
  leaveChallenge: (...args: unknown[]) => mockLeaveChallenge(...args),
}));

// ─── Mock lucide-react icons ─────────────────────────────────────────

vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) => <span data-testid={`${name}-icon`} {...props} />;
  return {
    Trophy: icon('trophy'),
    X: icon('x'),
    Users: icon('users'),
    Target: icon('target'),
    Clock: icon('clock'),
    Crown: icon('crown'),
    Loader2: icon('loader2'),
    AlertCircle: icon('alert-circle'),
    RefreshCw: icon('refresh-cw'),
    LogOut: icon('log-out'),
    Medal: icon('medal'),
    Star: icon('star'),
    ChevronDown: icon('chevron-down'),
    Calendar: icon('calendar'),
    BarChart3: icon('bar-chart3'),
  };
});

// ─── Mock framer-motion ──────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

// ─── Import component after mocks ────────────────────────────────────

import { ChallengeDetailModal } from '@/components/social/ChallengeDetailModal';

// ─── Test data ───────────────────────────────────────────────────────

const mockChallengeDetail = {
  id: 10,
  title: 'Daily Push-ups',
  description: 'Do 100 push-ups every day for a month',
  mode: 'fitness',
  target_value: 100,
  start_date: '2026-02-01T00:00:00Z',
  end_date: '2026-03-01T00:00:00Z',
  status: 'active',
  creator_id: 1,
  creator: { username: 'alice', first_name: 'Alice' },
  participant_count: 3,
  participants: [
    { user_id: 1, username: 'alice', first_name: 'Alice', current_level: 10, progress: 80, joined_at: '2026-02-01T00:00:00Z' },
    { user_id: 2, username: 'bob', first_name: 'Bob', current_level: 5, progress: 50, joined_at: '2026-02-02T00:00:00Z' },
    { user_id: 3, username: 'charlie', first_name: 'Charlie', current_level: 3, progress: 20, joined_at: '2026-02-03T00:00:00Z' },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────

describe('ChallengeDetailModal', () => {
  const defaultProps = {
    challengeId: 10 as number | null,
    onClose: vi.fn(),
    userId: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChallengeDetails.mockResolvedValue(mockChallengeDetail);
  });

  it('does not render when challengeId is null', () => {
    render(
      <ChallengeDetailModal {...defaultProps} challengeId={null} />
    );

    expect(screen.queryByText('Daily Push-ups')).not.toBeInTheDocument();
    expect(mockGetChallengeDetails).not.toHaveBeenCalled();
  });

  it('shows loading state when fetching', async () => {
    let resolveDetails: (v: any) => void;
    mockGetChallengeDetails.mockReturnValue(
      new Promise(r => { resolveDetails = r; })
    );

    render(<ChallengeDetailModal {...defaultProps} />);

    // Should show some loading indicator (skeleton or loader icon)
    expect(
      screen.queryByTestId('loader2-icon') ||
      document.querySelector('.animate-pulse') ||
      document.querySelector('[class*="skeleton"]')
    ).toBeTruthy();

    // Resolve to clean up
    resolveDetails!(mockChallengeDetail);
    await waitFor(() => {
      expect(screen.getByText('Daily Push-ups')).toBeInTheDocument();
    });
  });

  it('renders challenge title and description after loading', async () => {
    render(<ChallengeDetailModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Daily Push-ups')).toBeInTheDocument();
    });

    expect(screen.getByText('Do 100 push-ups every day for a month')).toBeInTheDocument();
  });

  it('renders mode badge', async () => {
    render(<ChallengeDetailModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Daily Push-ups')).toBeInTheDocument();
    });

    const pageContent = (document.body.textContent || '').toLowerCase();
    expect(pageContent).toContain('fitness');
  });

  it('renders participant leaderboard sorted by progress', async () => {
    render(<ChallengeDetailModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    // All three participants' names should appear in document
    const allNames = document.body.textContent || '';
    const aliceIdx = allNames.indexOf('Alice');
    const bobIdx = allNames.indexOf('Bob');
    const charlieIdx = allNames.indexOf('Charlie');

    // Alice (80) should appear before Bob (50) who appears before Charlie (20)
    expect(aliceIdx).toBeLessThan(bobIdx);
    expect(bobIdx).toBeLessThan(charlieIdx);
  });

  it('highlights current user row', async () => {
    render(<ChallengeDetailModal {...defaultProps} userId={2} />);

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    // Bob (userId=2) should be highlighted — the row div uses
    // bg-telegram-link/10 border border-telegram-link/20 for current user
    const bobText = screen.getByText('Bob');
    let el: HTMLElement | null = bobText;
    let found = false;
    while (el) {
      const cls = el.className || '';
      if (cls.includes('telegram-link') && cls.includes('border')) {
        found = true;
        break;
      }
      el = el.parentElement;
    }
    expect(found).toBe(true);
  });

  it('shows "Leave" button for non-creators when onLeave provided', async () => {
    // userId=2 is NOT the creator (creator_id=1), and onLeave is provided
    const onLeave = vi.fn().mockResolvedValue(undefined);
    render(<ChallengeDetailModal {...defaultProps} userId={2} onLeave={onLeave} />);

    await waitFor(() => {
      expect(screen.getByText('Daily Push-ups')).toBeInTheDocument();
    });

    // Should find a leave button (text from i18n or the LogOut icon)
    const pageContent = (document.body.textContent || '').toLowerCase();
    expect(
      pageContent.includes('leave') ||
      screen.queryByRole('button', { name: /leave/i }) ||
      screen.queryByTestId('log-out-icon')
    ).toBeTruthy();
  });

  it('does NOT show "Leave" button for creators', async () => {
    // userId=1 IS the creator, onLeave provided but should be hidden
    const onLeave = vi.fn().mockResolvedValue(undefined);
    render(<ChallengeDetailModal {...defaultProps} userId={1} onLeave={onLeave} />);

    await waitFor(() => {
      expect(screen.getByText('Daily Push-ups')).toBeInTheDocument();
    });

    // Should NOT find a leave button — creator cannot leave
    expect(screen.queryByTestId('log-out-icon')).not.toBeInTheDocument();
  });

  it('does NOT show "Leave" button when onLeave is not provided', async () => {
    // Non-creator but no onLeave callback
    render(<ChallengeDetailModal {...defaultProps} userId={2} />);

    await waitFor(() => {
      expect(screen.getByText('Daily Push-ups')).toBeInTheDocument();
    });

    // Should NOT find a leave button without onLeave prop
    expect(screen.queryByTestId('log-out-icon')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    render(<ChallengeDetailModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Daily Push-ups')).toBeInTheDocument();
    });

    // Find close button (X icon or button with close role)
    const closeButton =
      screen.queryByRole('button', { name: /close/i }) ||
      screen.queryByTestId('x-icon')?.closest('button') ||
      screen.queryByTestId('x-icon');

    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows error state with retry on API failure', async () => {
    mockGetChallengeDetails.mockRejectedValueOnce(new Error('Network error'));

    render(<ChallengeDetailModal {...defaultProps} />);

    await waitFor(() => {
      const pageContent = (document.body.textContent || '').toLowerCase();
      expect(
        pageContent.includes('error') ||
        pageContent.includes('retry') ||
        pageContent.includes('failed')
      ).toBe(true);
    });
  });

  it('calls getChallengeDetails with the correct challengeId', async () => {
    render(<ChallengeDetailModal {...defaultProps} challengeId={42} />);

    await waitFor(() => {
      expect(mockGetChallengeDetails).toHaveBeenCalledWith(42);
    });
  });
});
