/**
 * Tests for Inventory page (mini-app/src/pages/Inventory.tsx)
 *
 * Run 69 Agent E: Tests the inventory page created by Agent B.
 * Covers: render, category tabs, equip/unequip, empty state, loading/error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Mock navigate ──────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

// ─── Mock react-i18next ─────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const keys: Record<string, string> = {
        'inventory.title': 'Inventory',
        'inventory.empty': 'No items yet — visit the Shop!',
        'inventory.empty_category': 'No items in this category',
        'inventory.equip': 'Equip',
        'inventory.unequip': 'Unequip',
        'inventory.purchased_on': `Purchased ${params?.date ?? ''}`,
        'inventory.loading': 'Loading...',
        'inventory.couldNotLoad': 'Could not load inventory',
        'inventory.total_items': 'Total items',
        'inventory.visit_shop': 'Visit Shop',
        'inventory.tab_all': 'All',
        'inventory.tab_achievement': 'Achievements',
        'inventory.tab_avatar_item': 'Avatar Items',
        'inventory.tab_booster': 'Boosters',
        'inventory.cat_all': 'All',
        'inventory.cat_avatar': 'Avatar Items',
        'inventory.cat_achievement': 'Achievements',
        'inventory.cat_booster': 'Boosters',
        'inventory.cat_xp_booster': 'XP Boosters',
        'inventory.equipped': 'Equipped',
        'inventory.unequipped': `Unequipped ${params?.name ?? ''}`,
        'inventory.equip_failed': 'Failed to equip',
        'errors.somethingWentWrong': 'Something went wrong',
        'errors.tryAgain': 'Try Again',
        'errors.serverError': 'Please try again later',
        'common.retry': 'Retry',
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
  const IconStub = ({ className }: any) => <span data-testid="icon" className={className} />;
  return {
    Package: IconStub,
    ArrowLeft: IconStub,
    ShoppingBag: IconStub,
    CheckCircle: IconStub,
    AlertCircle: IconStub,
    RefreshCw: IconStub,
    Star: IconStub,
    Zap: IconStub,
    Crown: IconStub,
    Shield: IconStub,
    Info: IconStub,
    X: IconStub,
  };
});

// ─── Mock useTelegram ───────────────────────────────────────────────

vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({
    user: { id: 1, first_name: 'Test', username: 'test' },
    haptic: { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() },
  }),
  useBackButton: vi.fn(),
}));

// ─── Mock usePullToRefresh ──────────────────────────────────────────

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    containerRef: { current: null },
    pullDistance: 0,
    refreshing: false,
    pullThreshold: 80,
    touchHandlers: {},
  }),
  PullIndicator: () => null,
}));

// ─── Mock logger ────────────────────────────────────────────────────

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── Mock useInventory hook ─────────────────────────────────────────

const mockEquip = vi.fn();
const mockUnequip = vi.fn();
const mockRefresh = vi.fn();

const mockInventoryItems = [
  {
    purchase_id: 1, shop_item_id: 1, name: 'Golden Collector', type: 'achievement',
    description: 'A premium golden achievement', rarity: 'rare',
    icon_emoji: '🏅', purchased_at: '2026-02-10T12:00:00Z', is_equipped: false,
    payment_method: 'stars', amount_paid: 50,
  },
  {
    purchase_id: 2, shop_item_id: 3, name: 'Premium Hairstyle', type: 'avatar_item',
    description: 'An exclusive hairstyle', rarity: 'rare',
    icon_emoji: '💇', purchased_at: '2026-02-11T14:00:00Z', is_equipped: false,
    payment_method: 'stars', amount_paid: 30,
  },
  {
    purchase_id: 3, shop_item_id: 4, name: 'XP Doubler 24h', type: 'xp_booster',
    description: 'Double XP for 24 hours', rarity: 'common',
    icon_emoji: '⚡', purchased_at: '2026-02-12T10:00:00Z', is_equipped: false,
    payment_method: 'xp', amount_paid: 500,
  },
];

const mockSetCategory = vi.fn();

let hookReturn = {
  items: mockInventoryItems,
  grouped: {
    achievement: [mockInventoryItems[0]],
    avatar_item: [mockInventoryItems[1]],
    xp_booster: [mockInventoryItems[2]],
  } as Record<string, typeof mockInventoryItems>,
  filteredItems: mockInventoryItems,
  totalCount: mockInventoryItems.length,
  loading: false,
  error: null as string | null,
  category: 'all' as string,
  setCategory: mockSetCategory,
  equip: mockEquip,
  unequip: mockUnequip,
  refresh: mockRefresh,
};

vi.mock('@/hooks/useInventory', () => ({
  useInventory: () => hookReturn,
}));

// ─── Import after mocks ────────────────────────────────────────────

import { Inventory } from '@/pages/Inventory';

// ─── Helper ─────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/inventory']}>
      <Inventory />
    </MemoryRouter>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  hookReturn = {
    items: mockInventoryItems,
    grouped: {
      achievement: [mockInventoryItems[0]],
      avatar_item: [mockInventoryItems[1]],
      xp_booster: [mockInventoryItems[2]],
    },
    filteredItems: mockInventoryItems,
    totalCount: mockInventoryItems.length,
    loading: false,
    error: null,
    category: 'all',
    setCategory: mockSetCategory,
    equip: mockEquip,
    unequip: mockUnequip,
    refresh: mockRefresh,
  };
});

describe('Inventory', () => {
  it('renders page title "Inventory"', () => {
    renderPage();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
  });

  it('renders loading state when loading', () => {
    hookReturn = { ...hookReturn, loading: true, items: [], grouped: {}, filteredItems: [], totalCount: 0 };
    renderPage();
    // When loading, item names should not be visible
    expect(screen.queryByText('Golden Collector')).not.toBeInTheDocument();
  });

  it('renders owned items', () => {
    renderPage();
    expect(screen.getByText('Golden Collector')).toBeInTheDocument();
    expect(screen.getByText('Premium Hairstyle')).toBeInTheDocument();
    expect(screen.getByText('XP Doubler 24h')).toBeInTheDocument();
  });

  it('renders item emoji icons', () => {
    renderPage();
    expect(screen.getByText('🏅')).toBeInTheDocument();
    expect(screen.getByText('💇')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('shows category tabs', () => {
    renderPage();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('shows equip button for avatar items', () => {
    renderPage();
    // Avatar items should have equip button
    const equipButtons = screen.getAllByText('Equip');
    expect(equipButtons.length).toBeGreaterThan(0);
  });

  it('calls equip when equip button is clicked', () => {
    renderPage();
    const equipButton = screen.getAllByText('Equip')[0];
    fireEvent.click(equipButton);
    expect(mockEquip).toHaveBeenCalled();
  });

  it('shows unequip button for equipped items', () => {
    const equippedItem = { ...mockInventoryItems[1], is_equipped: true };
    hookReturn = {
      ...hookReturn,
      items: [equippedItem],
      filteredItems: [equippedItem],
      grouped: {
        avatar_item: [equippedItem],
      },
      totalCount: 1,
    };
    renderPage();
    expect(screen.getByText('Unequip')).toBeInTheDocument();
  });

  it('calls unequip when unequip button is clicked', () => {
    const equippedItem = { ...mockInventoryItems[1], is_equipped: true };
    hookReturn = {
      ...hookReturn,
      items: [equippedItem],
      filteredItems: [equippedItem],
      grouped: {
        avatar_item: [equippedItem],
      },
      totalCount: 1,
    };
    renderPage();
    const unequipButton = screen.getByText('Unequip');
    fireEvent.click(unequipButton);
    expect(mockUnequip).toHaveBeenCalled();
  });

  it('shows empty state when no items', () => {
    hookReturn = { ...hookReturn, items: [], grouped: {}, filteredItems: [], totalCount: 0 };
    renderPage();
    expect(screen.getByText('No items yet — visit the Shop!')).toBeInTheDocument();
  });

  it('renders error state', () => {
    hookReturn = { ...hookReturn, error: 'Failed to load', items: [], grouped: {}, filteredItems: [], totalCount: 0 };
    renderPage();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
