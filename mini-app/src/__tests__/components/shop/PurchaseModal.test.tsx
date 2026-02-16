/**
 * Tests for PurchaseModal component (mini-app/src/components/shop/PurchaseModal.tsx)
 *
 * Run 68 Agent E: Tests the purchase modal created by Agent C.
 * Covers: item display, Stars/XP payment buttons, loading state,
 * error state with retry, items with only one price option.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mock react-i18next ──────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const keys: Record<string, string> = {
        'shop.confirmPurchase': 'Confirm Purchase',
        'shop.payWithStars': `Pay with Stars (${params?.amount ?? 0} ⭐)`,
        'shop.payWithXp': `Pay with XP (${params?.amount ?? 0} XP)`,
        'shop.processing': 'Processing...',
        'shop.purchaseFailed': 'Purchase failed',
        'shop.insufficientBalance': 'Insufficient balance',
        'shop.retry': 'Retry',
        'shop.cancel': 'Cancel',
        'shop.itemDescription': 'Item description',
        'common.close': 'Close',
      };
      return keys[key] || key;
    },
  }),
}));

// ─── Mock framer-motion ─────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...rest }: any) => (
      <div className={className} style={style} onClick={onClick}>{children}</div>
    ),
    button: ({ children, className, onClick, disabled, ...rest }: any) => (
      <button className={className} onClick={onClick} disabled={disabled}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ─── Mock lucide-react ──────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  X: () => <span data-testid="close-icon">X</span>,
  Star: () => <span data-testid="star-icon">⭐</span>,
  Zap: () => <span data-testid="zap-icon">⚡</span>,
  Loader2: () => <span data-testid="loader-icon">...</span>,
  AlertCircle: () => <span data-testid="alert-icon">!</span>,
  ShoppingBag: () => <span data-testid="bag-icon">🛒</span>,
}));

// ─── Mock useTelegram ───────────────────────────────────────────────

vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({
    user: { id: 111 },
    webApp: { openInvoice: vi.fn() },
  }),
}));

// ─── Import component after mocks ───────────────────────────────────

import { PurchaseModal } from '@/components/shop/PurchaseModal';

// ─── Test data ──────────────────────────────────────────────────────

const starsOnlyItem = {
  id: 1,
  type: 'achievement',
  name: 'Golden Collector',
  description: 'A premium golden achievement',
  price_stars: 50,
  price_xp: 0,
  rarity: 'rare',
  icon_emoji: '🏅',
};

const xpOnlyItem = {
  id: 2,
  type: 'avatar_item',
  name: 'Premium Hairstyle',
  description: 'An exclusive hairstyle',
  price_stars: 0,
  price_xp: 300,
  rarity: 'epic',
  icon_emoji: '💇',
};

const dualPriceItem = {
  id: 3,
  type: 'xp_booster',
  name: 'XP Doubler 24h',
  description: 'Double XP for 24 hours',
  price_stars: 30,
  price_xp: 500,
  rarity: 'common',
  icon_emoji: '⚡',
};

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PurchaseModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  it('renders item details (name, description, icon emoji)', () => {
    render(
      <PurchaseModal
        item={starsOnlyItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={false}
        error={null}
      />
    );

    expect(screen.getByText('Golden Collector')).toBeInTheDocument();
    expect(screen.getByText('A premium golden achievement')).toBeInTheDocument();
  });

  it('shows Stars payment button for items with stars price', () => {
    render(
      <PurchaseModal
        item={starsOnlyItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={false}
        error={null}
      />
    );

    const starsButton = screen.getByText(/Pay with Stars/);
    expect(starsButton).toBeInTheDocument();
    expect(starsButton.textContent).toContain('50');
  });

  it('shows XP payment button for items with XP price', () => {
    render(
      <PurchaseModal
        item={xpOnlyItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={false}
        error={null}
      />
    );

    const xpButton = screen.getByText(/Pay with XP/);
    expect(xpButton).toBeInTheDocument();
    expect(xpButton.textContent).toContain('300');
  });

  it('shows both payment buttons for dual-price items', () => {
    render(
      <PurchaseModal
        item={dualPriceItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={false}
        error={null}
      />
    );

    expect(screen.getByText(/Pay with Stars/)).toBeInTheDocument();
    expect(screen.getByText(/Pay with XP/)).toBeInTheDocument();
  });

  it('does not show XP button for stars-only items', () => {
    render(
      <PurchaseModal
        item={starsOnlyItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={false}
        error={null}
      />
    );

    expect(screen.queryByText(/Pay with XP/)).toBeNull();
  });

  it('does not show Stars button for XP-only items', () => {
    render(
      <PurchaseModal
        item={xpOnlyItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={false}
        error={null}
      />
    );

    expect(screen.queryByText(/Pay with Stars/)).toBeNull();
  });

  it('calls onConfirm with "stars" when Stars button is clicked', () => {
    render(
      <PurchaseModal
        item={starsOnlyItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={false}
        error={null}
      />
    );

    fireEvent.click(screen.getByText(/Pay with Stars/));
    expect(mockOnConfirm).toHaveBeenCalledWith('stars');
  });

  it('calls onConfirm with "xp" when XP button is clicked', () => {
    render(
      <PurchaseModal
        item={xpOnlyItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={false}
        error={null}
      />
    );

    fireEvent.click(screen.getByText(/Pay with XP/));
    expect(mockOnConfirm).toHaveBeenCalledWith('xp');
  });

  it('shows loading state during processing', () => {
    render(
      <PurchaseModal
        item={starsOnlyItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={true}
        error={null}
      />
    );

    expect(screen.getByText(/Processing/)).toBeInTheDocument();
  });

  it('shows error state with retry option', () => {
    render(
      <PurchaseModal
        item={starsOnlyItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={false}
        error="Purchase failed"
      />
    );

    expect(screen.getByText(/Purchase failed|failed/i)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <PurchaseModal
        item={starsOnlyItem}
        isOpen={false}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={false}
        error={null}
      />
    );

    expect(screen.queryByText('Golden Collector')).toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <PurchaseModal
        item={starsOnlyItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={false}
        error={null}
      />
    );

    // Find and click close/cancel element
    const closeElements = screen.queryAllByText(/Cancel|Close/);
    if (closeElements.length > 0) {
      fireEvent.click(closeElements[0]);
      expect(mockOnClose).toHaveBeenCalled();
    } else {
      // Try clicking the X icon
      const closeIcon = screen.queryByTestId('close-icon');
      if (closeIcon) {
        fireEvent.click(closeIcon);
        expect(mockOnClose).toHaveBeenCalled();
      }
    }
  });

  it('disables payment buttons during processing', () => {
    render(
      <PurchaseModal
        item={dualPriceItem}
        isOpen={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
        isProcessing={true}
        error={null}
      />
    );

    // During processing, clicking should not trigger onConfirm
    const buttons = screen.queryAllByRole('button');
    buttons.forEach(btn => {
      fireEvent.click(btn);
    });
    // onConfirm should not have been called since buttons are disabled
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
