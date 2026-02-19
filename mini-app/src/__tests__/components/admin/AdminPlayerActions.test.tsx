/**
 * Tests for AdminPlayerActions component (mini-app/src/components/admin/AdminPlayerActions.tsx)
 *
 * Run 77 Agent I: Tests the admin player action modals created by Agent D.
 * Covers: award XP modal open/close/submit, unlock achievement dropdown,
 *         change tier select, send message, deactivate confirmation,
 *         success/error toasts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Mock react-i18next ─────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const keys: Record<string, string> = {
        'admin.actions.awardXp': 'Award XP',
        'admin.actions.awardXpTitle': 'Award XP to Player',
        'admin.actions.amount': 'Amount',
        'admin.actions.reason': 'Reason',
        'admin.actions.submit': 'Submit',
        'admin.actions.cancel': 'Cancel',
        'admin.actions.confirm': 'Confirm',
        'admin.actions.unlockAchievement': 'Unlock Achievement',
        'admin.actions.selectAchievement': 'Select an achievement',
        'admin.actions.changeTier': 'Change Tier',
        'admin.actions.selectTier': 'Select tier',
        'admin.actions.sendMessage': 'Send Message',
        'admin.actions.messageText': 'Message text',
        'admin.actions.deactivate': 'Deactivate Account',
        'admin.actions.deactivateConfirm': 'Are you sure you want to deactivate this account?',
        'admin.actions.success': 'Action completed successfully',
        'admin.actions.error': 'Action failed',
        'admin.actions.xpAwarded': `${params?.amount ?? 0} XP awarded successfully`,
        'admin.actions.achievementUnlocked': 'Achievement unlocked',
        'admin.actions.tierChanged': `Tier changed to ${params?.tier ?? ''}`,
        'admin.actions.messageSent': 'Message sent',
        'admin.actions.accountDeactivated': 'Account deactivated',
        'admin.actions.free': 'Free',
        'admin.actions.premium': 'Premium',
        'admin.actions.pro': 'Pro',
      };
      return keys[key] || key;
    },
  }),
}));

// ─── Mock framer-motion ─────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, className, style, onClick, role, ...rest }: any) => (
      <div className={className} style={style} onClick={onClick} role={role}>
        {children}
      </div>
    ),
    button: ({ children, onClick, className, type, disabled, ...rest }: any) => (
      <button onClick={onClick} className={className} type={type || 'button'} disabled={disabled}>
        {children}
      </button>
    ),
  },
}));

// ─── Mock lucide-react ──────────────────────────────────────────────

vi.mock('lucide-react', () => {
  const IconStub = ({ className, onClick }: any) => (
    <span data-testid="icon" className={className} onClick={onClick} />
  );
  return {
    Zap: IconStub,
    Award: IconStub,
    Shield: IconStub,
    MessageSquare: IconStub,
    UserX: IconStub,
    X: IconStub,
    Check: IconStub,
    AlertTriangle: IconStub,
    Loader2: IconStub,
  };
});

// ─── Mock useTelegram ───────────────────────────────────────────────

vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({
    user: { id: 1, first_name: 'Admin', username: 'admin' },
    haptic: { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() },
  }),
  useBackButton: vi.fn(),
}));

// ─── Mock API ───────────────────────────────────────────────────────

const mockFetch = vi.fn();

// ─── Import component after mocks ──────────────────────────────────

import { AdminPlayerActions } from '@/components/admin/AdminPlayerActions';

// ─── Test data ──────────────────────────────────────────────────────

const mockPlayer = {
  id: 1,
  telegram_id: 123456789,
  username: 'alice',
  first_name: 'Alice',
  current_level: 10,
  total_xp: 5000,
  tier: 'free',
  is_active: true,
};

const mockAchievements = [
  { id: 1, name: 'Early Bird', description: 'Complete a quest before 7 AM' },
  { id: 2, name: 'Streak Master', description: 'Maintain a 7-day streak' },
  { id: 3, name: 'Social Butterfly', description: 'Add 5 friends' },
];

const mockOnAction = vi.fn();

// ─── Helper ─────────────────────────────────────────────────────────

function renderActions(props: Partial<{
  player: typeof mockPlayer;
  achievements: typeof mockAchievements;
  onAction: typeof mockOnAction;
}> = {}) {
  return render(
    <MemoryRouter>
      <AdminPlayerActions
        player={props.player ?? mockPlayer}
        achievements={props.achievements ?? mockAchievements}
        onAction={props.onAction ?? mockOnAction}
      />
    </MemoryRouter>
  );
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('AdminPlayerActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);
  });

  // ─── Award XP Modal ──────────────────────────────────────────────

  it('renders Award XP action button', () => {
    renderActions();
    expect(screen.getByText('Award XP')).toBeInTheDocument();
  });

  it('opens Award XP modal when button is clicked', () => {
    renderActions();

    fireEvent.click(screen.getByText('Award XP'));

    expect(screen.getByText('Award XP to Player')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('closes Award XP modal when cancel is clicked', () => {
    renderActions();

    fireEvent.click(screen.getByText('Award XP'));
    expect(screen.getByText('Award XP to Player')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Award XP to Player')).not.toBeInTheDocument();
  });

  it('submits Award XP with valid amount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { player: { ...mockPlayer, total_xp: 5500 } } }),
    });

    renderActions();

    fireEvent.click(screen.getByText('Award XP'));

    const amountInput = screen.getByLabelText(/amount/i) || screen.getByPlaceholderText(/amount|xp/i);
    fireEvent.change(amountInput, { target: { value: '500' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/players/1/award-xp'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('500'),
        })
      );
    });

    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalled();
    });
  });

  it('shows error toast when Award XP fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'Invalid amount' }),
    });

    renderActions();

    fireEvent.click(screen.getByText('Award XP'));

    const amountInput = screen.getByLabelText(/amount/i) || screen.getByPlaceholderText(/amount|xp/i);
    fireEvent.change(amountInput, { target: { value: '-100' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText(/error|failed|invalid/i)).toBeInTheDocument();
    });
  });

  // ─── Unlock Achievement ──────────────────────────────────────────

  it('renders Unlock Achievement action button', () => {
    renderActions();
    expect(screen.getByText('Unlock Achievement')).toBeInTheDocument();
  });

  it('shows achievement dropdown when Unlock Achievement is clicked', () => {
    renderActions();

    fireEvent.click(screen.getByText('Unlock Achievement'));

    expect(screen.getByText('Early Bird')).toBeInTheDocument();
    expect(screen.getByText('Streak Master')).toBeInTheDocument();
  });

  // ─── Change Tier ─────────────────────────────────────────────────

  it('renders Change Tier action button', () => {
    renderActions();
    expect(screen.getByText('Change Tier')).toBeInTheDocument();
  });

  it('shows tier options when Change Tier is clicked', () => {
    renderActions();

    fireEvent.click(screen.getByText('Change Tier'));

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('submits tier change and calls onAction', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { player: { ...mockPlayer, tier: 'premium' } } }),
    });

    renderActions();

    fireEvent.click(screen.getByText('Change Tier'));
    fireEvent.click(screen.getByText('Premium'));

    // Confirm if needed
    const confirmBtn = screen.queryByText('Confirm');
    if (confirmBtn) {
      fireEvent.click(confirmBtn);
    }

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/players/1/tier'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  // ─── Send Message ────────────────────────────────────────────────

  it('renders Send Message action button', () => {
    renderActions();
    expect(screen.getByText('Send Message')).toBeInTheDocument();
  });

  it('opens message form and submits', async () => {
    renderActions();

    fireEvent.click(screen.getByText('Send Message'));

    const messageInput = screen.getByPlaceholderText(/message/i) || screen.getByLabelText(/message/i);
    fireEvent.change(messageInput, { target: { value: 'Hello from admin!' } });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/players/1/message'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Hello from admin!'),
        })
      );
    });
  });

  // ─── Deactivate Account ──────────────────────────────────────────

  it('renders Deactivate Account action button', () => {
    renderActions();
    expect(screen.getByText('Deactivate Account')).toBeInTheDocument();
  });

  it('shows confirmation dialog before deactivation', () => {
    renderActions();

    fireEvent.click(screen.getByText('Deactivate Account'));

    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('cancels deactivation when cancel is clicked', () => {
    renderActions();

    fireEvent.click(screen.getByText('Deactivate Account'));
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
  });
});
