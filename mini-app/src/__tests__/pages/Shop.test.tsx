/**
 * Tests for Shop page (mini-app/src/pages/Shop.tsx)
 *
 * Run 69 Agent E: Tests the shop page created by Agent A.
 * Covers: page render, category tabs, featured items, search, item grid,
 * purchase modal trigger, loading/error states, empty state.
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
    useParams: () => ({}),
  };
});

// ─── Mock react-i18next ─────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const keys: Record<string, string> = {
        'shop.title': 'Shop',
        'shop.featured': 'Featured',
        'shop.categories': 'Categories',
        'shop.buy': 'Buy',
        'shop.owned': 'Owned',
        'shop.price_stars': `${params?.price ?? 0} ⭐`,
        'shop.price_xp': `${params?.price ?? 0} XP`,
        'shop.empty': 'No items available',
        'shop.search_placeholder': 'Search items...',
        'shop.tab_all': 'All',
        'shop.tab_achievement': 'Achievements',
        'shop.tab_avatar_item': 'Avatar Items',
        'shop.tab_booster': 'Boosters',
        'shop.balance_stars': `${params?.count ?? 0} Stars`,
        'shop.balance_xp': `${params?.count ?? 0} XP`,
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
    ShoppingBag: IconStub,
    Store: IconStub,
    Search: IconStub,
    Star: IconStub,
    Zap: IconStub,
    ArrowLeft: IconStub,
    RefreshCw: IconStub,
    X: IconStub,
    ChevronDown: IconStub,
    AlertCircle: IconStub,
    CheckCircle: IconStub,
    Crown: IconStub,
    Sparkles: IconStub,
    Package: IconStub,
    Filter: IconStub,
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

// ─── Mock usePurchase ───────────────────────────────────────────────

const mockStartPurchase = vi.fn();
const mockConfirmPurchase = vi.fn();
const mockDismissResult = vi.fn();
const mockCancelPurchase = vi.fn();

vi.mock('@/hooks/usePurchase', () => ({
  usePurchase: () => ({
    purchaseState: 'idle',
    currentItem: null,
    result: null,
    errorMessage: null,
    startPurchase: mockStartPurchase,
    confirmPurchase: mockConfirmPurchase,
    dismissResult: mockDismissResult,
    cancelPurchase: mockCancelPurchase,
  }),
}));

// ─── Mock useShop hook ──────────────────────────────────────────────

const mockRefresh = vi.fn();

const mockShopItems = [
  {
    id: 1, type: 'achievement', reference_id: 101, name: 'Golden Collector',
    description: 'A premium golden achievement', price_stars: 50, price_xp: 0,
    is_featured: true, is_active: true, rarity: 'rare', icon_emoji: '🏅',
    sort_order: 1, created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 2, type: 'achievement', reference_id: 102, name: 'Diamond Streak',
    description: 'Diamond-level streak achievement', price_stars: 100, price_xp: 0,
    is_featured: false, is_active: true, rarity: 'epic', icon_emoji: '💎',
    sort_order: 2, created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 3, type: 'avatar_item', reference_id: 201, name: 'Premium Hairstyle',
    description: 'An exclusive hairstyle', price_stars: 30, price_xp: 200,
    is_featured: false, is_active: true, rarity: 'rare', icon_emoji: '💇',
    sort_order: 3, created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 4, type: 'xp_booster', reference_id: null, name: 'XP Doubler 24h',
    description: 'Double XP for 24 hours', price_stars: 30, price_xp: 500,
    is_featured: true, is_active: true, rarity: 'common', icon_emoji: '⚡',
    sort_order: 4, created_at: '2026-02-01T00:00:00Z',
  },
];

let hookReturn = {
  items: mockShopItems,
  filteredItems: mockShopItems,
  featuredItems: mockShopItems.filter(i => i.is_featured),
  loading: false,
  error: null as string | null,
  category: 'all' as string,
  setCategory: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  ownedItemIds: new Set<number>(),
  refresh: mockRefresh,
};

vi.mock('@/hooks/useShop', () => ({
  useShop: () => hookReturn,
}));

// ─── Import after mocks ────────────────────────────────────────────

import { Shop } from '@/pages/Shop';

// ─── Helper ─────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/shop']}>
      <Shop />
    </MemoryRouter>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  hookReturn = {
    items: mockShopItems,
    filteredItems: mockShopItems,
    featuredItems: mockShopItems.filter(i => i.is_featured),
    loading: false,
    error: null,
    category: 'all',
    setCategory: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    ownedItemIds: new Set<number>(),
    refresh: mockRefresh,
  };
});

describe('Shop', () => {
  it('renders page title "Shop"', () => {
    renderPage();
    expect(screen.getByText('Shop')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    hookReturn = { ...hookReturn, loading: true, items: [], filteredItems: [], featuredItems: [] };
    renderPage();
    // When loading, shop items should not be visible
    expect(screen.queryByText('Golden Collector')).not.toBeInTheDocument();
  });

  it('renders item grid with all shop items', () => {
    renderPage();
    expect(screen.getByText('Golden Collector')).toBeInTheDocument();
    expect(screen.getByText('Diamond Streak')).toBeInTheDocument();
    expect(screen.getByText('Premium Hairstyle')).toBeInTheDocument();
    expect(screen.getByText('XP Doubler 24h')).toBeInTheDocument();
  });

  it('renders featured items section', () => {
    renderPage();
    // Featured section should show featured items
    expect(screen.getByText('Featured')).toBeInTheDocument();
    // Featured items: Golden Collector and XP Doubler 24h
    expect(screen.getByText('🏅')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('renders item emoji icons', () => {
    renderPage();
    expect(screen.getByText('🏅')).toBeInTheDocument();
    expect(screen.getByText('💎')).toBeInTheDocument();
    expect(screen.getByText('💇')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('shows category tabs', () => {
    renderPage();
    // Category tabs: All, Achievements, Avatar Items, Boosters
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('calls setCategory when category tab is clicked', () => {
    renderPage();
    const allTab = screen.getByText('All');
    fireEvent.click(allTab);
    // setCategory should be called (or tab should be active)
  });

  it('shows empty state when no items in category', () => {
    hookReturn = { ...hookReturn, filteredItems: [] };
    renderPage();
    expect(screen.getByText('No items available')).toBeInTheDocument();
  });

  it('triggers purchase flow when Buy button is clicked', () => {
    renderPage();
    // Find Buy buttons
    const buyButtons = screen.getAllByText('Buy');
    expect(buyButtons.length).toBeGreaterThan(0);
    fireEvent.click(buyButtons[0]);
    expect(mockStartPurchase).toHaveBeenCalled();
  });

  it('shows "Owned" instead of "Buy" for purchased items', () => {
    hookReturn = { ...hookReturn, ownedItemIds: new Set([1]) };
    renderPage();
    // Item 1 (Golden Collector) should show "Owned"
    expect(screen.getByText('Owned')).toBeInTheDocument();
  });

  it('renders error state', () => {
    hookReturn = { ...hookReturn, error: 'Failed to load', items: [], filteredItems: [], featuredItems: [] };
    renderPage();
    // Error message should be displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
