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
        'inventory.equip': 'Equip',
        'inventory.unequip': 'Unequip',
        'inventory.purchased_on': `Purchased ${params?.date ?? ''}`,
        'inventory.tab_all': 'All',
        'inventory.tab_achievement': 'Achievements',
        'inventory.tab_avatar_item': 'Avatar Items',
        'inventory.tab_booster': 'Boosters',
        'inventory.equipped': 'Equipped',
        'errors.somethingWentWrong': 'Something went wrong',
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
    Star: IconStub,
    Zap: IconStub,
    Crown: IconStub,
    Shield: IconStub,
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
    id: 1, shop_item_id: 1, name: 'Golden Collector', type: 'achievement',
    description: 'A premium golden achievement', rarity: 'rare',
    icon_emoji: '🏅', purchased_at: '2026-02-10T12:00:00Z', is_equipped: false,
  },
  {
    id: 2, shop_item_id: 3, name: 'Premium Hairstyle', type: 'avatar_item',
    description: 'An exclusive hairstyle', rarity: 'rare',
    icon_emoji: '💇', purchased_at: '2026-02-11T14:00:00Z', is_equipped: false,
  },
  {
    id: 3, shop_item_id: 4, name: 'XP Doubler 24h', type: 'xp_booster',
    description: 'Double XP for 24 hours', rarity: 'common',
    icon_emoji: '⚡', purchased_at: '2026-02-12T10:00:00Z', is_equipped: false,
  },
];

let hookReturn = {
  items: mockInventoryItems,
  groupedItems: {
    achievement: [mockInventoryItems[0]],
    avatar_item: [mockInventoryItems[1]],
    xp_booster: [mockInventoryItems[2]],
  } as Record<string, typeof mockInventoryItems>,
  loading: false,
  error: null as string | null,
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
    groupedItems: {
      achievement: [mockInventoryItems[0]],
      avatar_item: [mockInventoryItems[1]],
      xp_booster: [mockInventoryItems[2]],
    },
    loading: false,
    error: null,
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
    hookReturn = { ...hookReturn, loading: true, items: [], groupedItems: {} };
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
    hookReturn = {
      ...hookReturn,
      items: [{ ...mockInventoryItems[1], is_equipped: true }],
      groupedItems: {
        avatar_item: [{ ...mockInventoryItems[1], is_equipped: true }],
      },
    };
    renderPage();
    expect(screen.getByText('Unequip')).toBeInTheDocument();
  });

  it('calls unequip when unequip button is clicked', () => {
    hookReturn = {
      ...hookReturn,
      items: [{ ...mockInventoryItems[1], is_equipped: true }],
      groupedItems: {
        avatar_item: [{ ...mockInventoryItems[1], is_equipped: true }],
      },
    };
    renderPage();
    const unequipButton = screen.getByText('Unequip');
    fireEvent.click(unequipButton);
    expect(mockUnequip).toHaveBeenCalled();
  });

  it('shows empty state when no items', () => {
    hookReturn = { ...hookReturn, items: [], groupedItems: {} };
    renderPage();
    expect(screen.getByText('No items yet — visit the Shop!')).toBeInTheDocument();
  });

  it('renders error state', () => {
    hookReturn = { ...hookReturn, error: 'Failed to load', items: [], groupedItems: {} };
    renderPage();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
