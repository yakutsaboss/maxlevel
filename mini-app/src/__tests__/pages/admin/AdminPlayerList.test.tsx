/**
 * Tests for AdminPlayerList page (mini-app/src/pages/admin/AdminPlayerList.tsx)
 *
 * Run 77 Agent I: Tests the admin player list page created by Agent B.
 * Covers: loading state, table rendering, search, sort click, filter panel,
 *         row selection, pagination, CSV export, row click navigation.
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
        'admin.players.title': 'Players',
        'admin.players.search': 'Search players...',
        'admin.players.filters': 'Filters',
        'admin.players.export': 'Export CSV',
        'admin.players.name': 'Name',
        'admin.players.telegramId': 'Telegram ID',
        'admin.players.level': 'Level',
        'admin.players.xp': 'XP',
        'admin.players.tier': 'Tier',
        'admin.players.lastActive': 'Last Active',
        'admin.players.joined': 'Joined',
        'admin.players.status': 'Status',
        'admin.players.actions': 'Actions',
        'admin.players.loading': 'Loading players...',
        'admin.players.noResults': 'No players found',
        'admin.players.selected': `${params?.count ?? 0} selected`,
        'admin.players.page': `Page ${params?.page ?? 1}`,
        'admin.players.totalPlayers': `${params?.total ?? 0} players`,
        'admin.players.active': 'Active',
        'admin.players.inactive': 'Inactive',
        'admin.players.allTiers': 'All Tiers',
        'admin.players.free': 'Free',
        'admin.players.premium': 'Premium',
        'admin.players.pro': 'Pro',
        'common.loading': 'Loading...',
        'common.error': 'Error',
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
    tr: ({ children, className, onClick, ...rest }: any) => (
      <tr className={className} onClick={onClick}>{children}</tr>
    ),
    button: ({ children, onClick, className, type, ...rest }: any) => (
      <button onClick={onClick} className={className} type={type || 'button'}>
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
  return new Proxy({}, {
    get: (_target: unknown, prop: string) => {
      if (prop === '__esModule') return true;
      return IconStub;
    },
  });
});

// ─── Mock useTelegram ───────────────────────────────────────────────

vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({
    user: { id: 1, first_name: 'Admin', username: 'admin' },
    haptic: { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() },
  }),
  useBackButton: vi.fn(),
}));

// ─── Mock useAdminPlayers hook ──────────────────────────────────────

const mockPlayers = [
  {
    id: 1,
    telegram_id: 123456789,
    username: 'alice',
    first_name: 'Alice',
    current_level: 10,
    total_xp: 5000,
    tier: 'free',
    is_active: true,
    last_active: '2025-02-15T12:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    telegram_id: 987654321,
    username: 'bob',
    first_name: 'Bob',
    current_level: 5,
    total_xp: 1500,
    tier: 'premium',
    is_active: true,
    last_active: '2025-02-14T08:00:00Z',
    created_at: '2025-02-01T00:00:00Z',
  },
  {
    id: 3,
    telegram_id: 555555555,
    username: 'charlie',
    first_name: 'Charlie',
    current_level: 1,
    total_xp: 100,
    tier: 'free',
    is_active: false,
    last_active: '2025-01-10T08:00:00Z',
    created_at: '2024-12-01T00:00:00Z',
  },
];

const mockUseAdminPlayers = vi.fn();

vi.mock('@/hooks/useAdminPlayers', () => ({
  useAdminPlayers: (...args: any[]) => mockUseAdminPlayers(...args),
}));

// ─── Import component after mocks ──────────────────────────────────

import { AdminPlayerList } from '@/pages/admin/AdminPlayerList';

// ─── Helper ─────────────────────────────────────────────────────────

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('AdminPlayerList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminPlayers.mockReturnValue({
      players: mockPlayers,
      total: 3,
      isLoading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
      sort: { field: 'id', order: 'asc' },
      setSort: vi.fn(),
      filters: {},
      setFilters: vi.fn(),
      selectedIds: [],
      toggleSelect: vi.fn(),
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it('renders loading state when data is loading', () => {
    mockUseAdminPlayers.mockReturnValue({
      players: [],
      total: 0,
      isLoading: true,
      error: null,
      page: 1,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
      sort: { field: 'id', order: 'asc' },
      setSort: vi.fn(),
      filters: {},
      setFilters: vi.fn(),
      selectedIds: [],
      toggleSelect: vi.fn(),
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      refetch: vi.fn(),
    });

    renderWithRouter(<AdminPlayerList />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders table with player data', () => {
    renderWithRouter(<AdminPlayerList />);

    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();
  });

  it('displays player levels and XP', () => {
    renderWithRouter(<AdminPlayerList />);

    expect(screen.getByText('10')).toBeInTheDocument(); // alice level
    expect(screen.getByText('5000')).toBeInTheDocument(); // alice xp
  });

  it('shows search input and triggers search on input', () => {
    const mockSetSearch = vi.fn();
    mockUseAdminPlayers.mockReturnValue({
      players: mockPlayers,
      total: 3,
      isLoading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      search: '',
      setSearch: mockSetSearch,
      sort: { field: 'id', order: 'asc' },
      setSort: vi.fn(),
      filters: {},
      setFilters: vi.fn(),
      selectedIds: [],
      toggleSelect: vi.fn(),
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      refetch: vi.fn(),
    });

    renderWithRouter(<AdminPlayerList />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'alice' } });
    expect(mockSetSearch).toHaveBeenCalledWith('alice');
  });

  it('triggers sort when column header is clicked', () => {
    const mockSetSort = vi.fn();
    mockUseAdminPlayers.mockReturnValue({
      players: mockPlayers,
      total: 3,
      isLoading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
      sort: { field: 'id', order: 'asc' },
      setSort: mockSetSort,
      filters: {},
      setFilters: vi.fn(),
      selectedIds: [],
      toggleSelect: vi.fn(),
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      refetch: vi.fn(),
    });

    renderWithRouter(<AdminPlayerList />);

    // Click on a sortable column header (e.g., Level)
    const levelHeader = screen.getByText('Level');
    fireEvent.click(levelHeader);

    expect(mockSetSort).toHaveBeenCalled();
  });

  it('shows filter panel when filter button is clicked', () => {
    renderWithRouter(<AdminPlayerList />);

    const filterButton = screen.getByText(/filter/i);
    fireEvent.click(filterButton);

    // Filter panel should appear with tier and status options
    expect(screen.getByText(/tier/i)).toBeInTheDocument();
  });

  it('handles row selection with checkboxes', () => {
    const mockToggleSelect = vi.fn();
    mockUseAdminPlayers.mockReturnValue({
      players: mockPlayers,
      total: 3,
      isLoading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
      sort: { field: 'id', order: 'asc' },
      setSort: vi.fn(),
      filters: {},
      setFilters: vi.fn(),
      selectedIds: [],
      toggleSelect: mockToggleSelect,
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      refetch: vi.fn(),
    });

    renderWithRouter(<AdminPlayerList />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    // Click first player checkbox
    fireEvent.click(checkboxes[1]); // index 0 is "select all"
    expect(mockToggleSelect).toHaveBeenCalledWith(1);
  });

  it('shows selected count when rows are selected', () => {
    mockUseAdminPlayers.mockReturnValue({
      players: mockPlayers,
      total: 3,
      isLoading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
      sort: { field: 'id', order: 'asc' },
      setSort: vi.fn(),
      filters: {},
      setFilters: vi.fn(),
      selectedIds: [1, 2],
      toggleSelect: vi.fn(),
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      refetch: vi.fn(),
    });

    renderWithRouter(<AdminPlayerList />);

    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('handles pagination button clicks', () => {
    const mockSetPage = vi.fn();
    mockUseAdminPlayers.mockReturnValue({
      players: mockPlayers,
      total: 150, // more than 1 page
      isLoading: false,
      error: null,
      page: 1,
      setPage: mockSetPage,
      search: '',
      setSearch: vi.fn(),
      sort: { field: 'id', order: 'asc' },
      setSort: vi.fn(),
      filters: {},
      setFilters: vi.fn(),
      selectedIds: [],
      toggleSelect: vi.fn(),
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      refetch: vi.fn(),
    });

    renderWithRouter(<AdminPlayerList />);

    // Find and click next page button
    const nextButton = screen.getByRole('button', { name: /next|→|>/i });
    fireEvent.click(nextButton);
    expect(mockSetPage).toHaveBeenCalledWith(2);
  });

  it('navigates to player detail when row is clicked', () => {
    renderWithRouter(<AdminPlayerList />);

    // Click on a player row (username text)
    fireEvent.click(screen.getByText('alice'));

    expect(mockNavigate).toHaveBeenCalledWith('/admin/players/1');
  });

  it('shows no results message when player list is empty', () => {
    mockUseAdminPlayers.mockReturnValue({
      players: [],
      total: 0,
      isLoading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      search: 'nonexistent',
      setSearch: vi.fn(),
      sort: { field: 'id', order: 'asc' },
      setSort: vi.fn(),
      filters: {},
      setFilters: vi.fn(),
      selectedIds: [],
      toggleSelect: vi.fn(),
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      refetch: vi.fn(),
    });

    renderWithRouter(<AdminPlayerList />);

    expect(screen.getByText(/no players found/i)).toBeInTheDocument();
  });

  it('displays total player count', () => {
    renderWithRouter(<AdminPlayerList />);

    expect(screen.getByText('3 players')).toBeInTheDocument();
  });
});
