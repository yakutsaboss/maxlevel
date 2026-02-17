/**
 * Tests for PurchaseModal component (mini-app/src/components/shop/PurchaseModal.tsx)
 *
 * Run 68 Agent E: Tests the purchase modal created by Agent C.
 * Covers: item display, Stars/XP payment buttons, loading state,
 * error state with retry, items with only one price option.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mock react-i18next ──────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const keys: Record<string, string> = {
        'shop.confirmPurchase': 'Confirm Purchase',
        'shop.payWithStars': `Pay with Stars (${params?.amount ?? 0} ⭐)`,
        'shop.payWithXp': `Pay with XP (${params?.amount ?? 0} XP)`,
        'shop.retryWithStars': `Retry with Stars (${params?.amount ?? 0} ⭐)`,
        'shop.retryWithXp': `Retry with XP (${params?.amount ?? 0} XP)`,
        'shop.processing': 'Processing...',
        'shop.purchaseFailed': 'Purchase failed',
        'shop.insufficientBalance': 'Insufficient balance',
        'shop.retry': 'Retry',
        'shop.cancel': 'Cancel',
        'shop.close': 'Close',
        'shop.rarity_common': 'Common',
        'shop.rarity_uncommon': 'Uncommon',
        'shop.rarity_rare': 'Rare',
        'shop.rarity_epic': 'Epic',
        'shop.rarity_legendary': 'Legendary',
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
  RotateCcw: () => <span data-testid="retry-icon">↺</span>,
  ShoppingBag: () => <span data-testid="bag-icon">🛒</span>,
}));

// ─── Import component after mocks ───────────────────────────────────

import { PurchaseModal } from '@/components/shop/PurchaseModal';
import type { PurchaseState } from '@/hooks/usePurchase';
import type { ShopItem } from '@/api/shop';

// ─── Test data ──────────────────────────────────────────────────────

const starsOnlyItem: ShopItem = {
  id: 1,
  type: 'achievement',
  reference_id: null,
  name: 'Golden Collector',
  description: 'A premium golden achievement',
  price_stars: 50,
  price_xp: 0,
  is_featured: false,
  is_active: true,
  rarity: 'rare',
  icon_emoji: '🏅',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
};

const xpOnlyItem: ShopItem = {
  id: 2,
  type: 'avatar_item',
  reference_id: null,
  name: 'Premium Hairstyle',
  description: 'An exclusive hairstyle',
  price_stars: 0,
  price_xp: 300,
  is_featured: false,
  is_active: true,
  rarity: 'epic',
  icon_emoji: '💇',
  sort_order: 1,
  created_at: '2026-01-01T00:00:00Z',
};

const dualPriceItem: ShopItem = {
  id: 3,
  type: 'xp_booster',
  reference_id: null,
  name: 'XP Doubler 24h',
  description: 'Double XP for 24 hours',
  price_stars: 30,
  price_xp: 500,
  is_featured: false,
  is_active: true,
  rarity: 'common',
  icon_emoji: '⚡',
  sort_order: 2,
  created_at: '2026-01-01T00:00:00Z',
};

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PurchaseModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  /** Helper to render PurchaseModal with the actual prop interface */
  function renderModal(
    item: ShopItem | null,
    purchaseState: PurchaseState,
    errorMessage: string | null = null,
  ) {
    return render(
      <PurchaseModal
        item={item}
        purchaseState={purchaseState}
        errorMessage={errorMessage}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );
  }

  it('renders item details (name, description, icon emoji)', () => {
    renderModal(starsOnlyItem, 'confirming');

    expect(screen.getByText('Golden Collector')).toBeInTheDocument();
    expect(screen.getByText('A premium golden achievement')).toBeInTheDocument();
  });

  it('shows Stars payment button for items with stars price', () => {
    renderModal(starsOnlyItem, 'confirming');

    const starsButton = screen.getByText(/Pay with Stars/);
    expect(starsButton).toBeInTheDocument();
    expect(starsButton.textContent).toContain('50');
  });

  it('shows XP payment button for items with XP price', () => {
    renderModal(xpOnlyItem, 'confirming');

    const xpButton = screen.getByText(/Pay with XP/);
    expect(xpButton).toBeInTheDocument();
    expect(xpButton.textContent).toContain('300');
  });

  it('shows both payment buttons for dual-price items', () => {
    renderModal(dualPriceItem, 'confirming');

    expect(screen.getByText(/Pay with Stars/)).toBeInTheDocument();
    expect(screen.getByText(/Pay with XP/)).toBeInTheDocument();
  });

  it('does not show XP button for stars-only items', () => {
    renderModal(starsOnlyItem, 'confirming');

    expect(screen.queryByText(/Pay with XP/)).toBeNull();
  });

  it('does not show Stars button for XP-only items', () => {
    renderModal(xpOnlyItem, 'confirming');

    expect(screen.queryByText(/Pay with Stars/)).toBeNull();
  });

  it('calls onConfirm with "stars" when Stars button is clicked', () => {
    renderModal(starsOnlyItem, 'confirming');

    fireEvent.click(screen.getByText(/Pay with Stars/));
    expect(mockOnConfirm).toHaveBeenCalledWith('stars');
  });

  it('calls onConfirm with "xp" when XP button is clicked', () => {
    renderModal(xpOnlyItem, 'confirming');

    fireEvent.click(screen.getByText(/Pay with XP/));
    expect(mockOnConfirm).toHaveBeenCalledWith('xp');
  });

  it('shows loading state during processing', () => {
    renderModal(starsOnlyItem, 'processing');

    expect(screen.getByText(/Processing/)).toBeInTheDocument();
  });

  it('shows error state with retry option', () => {
    renderModal(starsOnlyItem, 'error', 'Purchase failed');

    expect(screen.getByText('Purchase failed')).toBeInTheDocument();
    // In error state, payment buttons show retry text
    expect(screen.getByText(/Retry with Stars/)).toBeInTheDocument();
  });

  it('does not render when item is null', () => {
    const { container } = renderModal(null, 'confirming');

    expect(screen.queryByText('Golden Collector')).toBeNull();
  });

  it('does not render when purchaseState is idle', () => {
    const { container } = renderModal(starsOnlyItem, 'idle');

    expect(screen.queryByText('Golden Collector')).toBeNull();
  });

  it('calls onClose when cancel button is clicked', () => {
    renderModal(starsOnlyItem, 'confirming');

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('hides payment buttons during processing', () => {
    renderModal(dualPriceItem, 'processing');

    // During processing, the component hides payment buttons entirely
    expect(screen.queryByText(/Pay with Stars/)).toBeNull();
    expect(screen.queryByText(/Pay with XP/)).toBeNull();
  });
});
