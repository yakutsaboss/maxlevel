import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { adminFetch } from '@/api/adminClient';
import { logger } from '@/utils/logger';

export interface PlayerRow {
  id: number;
  telegram_id: number;
  display_name: string;
  avatar_id: string | null;
  level: number;
  xp: number;
  tier: string;
  active_modes: string[];
  last_active: string | null;
  created_at: string;
  status: 'active' | 'inactive';
}

export type SortField = 'display_name' | 'telegram_id' | 'level' | 'xp' | 'tier' | 'last_active' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface PlayerFilters {
  tier: string;
  mode: string;
  status: string;
  levelMin: string;
  levelMax: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: PlayerFilters = {
  tier: '',
  mode: '',
  status: '',
  levelMin: '',
  levelMax: '',
  dateFrom: '',
  dateTo: '',
};

interface UseAdminPlayersReturn {
  players: PlayerRow[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  total: number;
  sortField: SortField;
  sortOrder: SortOrder;
  search: string;
  filters: PlayerFilters;
  selectedIds: Set<number>;
  allSelected: boolean;
  setSearch: (q: string) => void;
  setSort: (field: SortField) => void;
  setPage: (p: number) => void;
  setFilters: (f: PlayerFilters) => void;
  resetFilters: () => void;
  toggleSelect: (id: number) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  refresh: () => Promise<void>;
  exportCsv: () => void;
}

const LIMIT = 50;

export function useAdminPlayers(credentials: string): UseAdminPlayersReturn {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageRaw] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<SortField>('level');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [search, setSearchRaw] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFiltersRaw] = useState<PlayerFilters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const mountedRef = useRef(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPageRaw(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

  const loadData = useCallback(async () => {
    if (!credentials) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        sort: sortField,
        order: sortOrder,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filters.tier) params.set('tier', filters.tier);
      if (filters.mode) params.set('mode', filters.mode);
      if (filters.status) params.set('status', filters.status);
      if (filters.levelMin) params.set('level_min', filters.levelMin);
      if (filters.levelMax) params.set('level_max', filters.levelMax);
      if (filters.dateFrom) params.set('date_from', filters.dateFrom);
      if (filters.dateTo) params.set('date_to', filters.dateTo);

      const res = await adminFetch(`/players?${params.toString()}`, credentials);
      if (!mountedRef.current) return;

      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setPlayers(data.players || []);
        setTotal(data.total || 0);
      } else if (res.status === 401) {
        setError('Unauthorized — please re-login');
      } else {
        setError(`Server error (${res.status})`);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load players';
      setError(msg);
      logger.error('useAdminPlayers loadData error', { error: err });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [credentials, page, sortField, sortOrder, debouncedSearch, filters]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  const setSearch = useCallback((q: string) => {
    setSearchRaw(q);
  }, []);

  const setSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortOrder('desc');
      }
      return field;
    });
    setPageRaw(1);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageRaw(Math.max(1, Math.min(p, totalPages)));
    setSelectedIds(new Set());
  }, [totalPages]);

  const setFilters = useCallback((f: PlayerFilters) => {
    setFiltersRaw(f);
    setPageRaw(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersRaw(EMPTY_FILTERS);
    setPageRaw(1);
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const allSelected = useMemo(
    () => players.length > 0 && players.every((p) => selectedIds.has(p.id)),
    [players, selectedIds],
  );

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(players.map((p) => p.id)));
    }
  }, [allSelected, players]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const exportCsv = useCallback(() => {
    const rows = selectedIds.size > 0
      ? players.filter((p) => selectedIds.has(p.id))
      : players;

    const headers = ['ID', 'Telegram ID', 'Display Name', 'Level', 'XP', 'Tier', 'Active Modes', 'Last Active', 'Joined', 'Status'];
    const csvLines = [
      headers.join(','),
      ...rows.map((p) => [
        p.id,
        p.telegram_id,
        `"${(p.display_name || '').replace(/"/g, '""')}"`,
        p.level,
        p.xp,
        p.tier,
        `"${(p.active_modes || []).join(', ')}"`,
        p.last_active || '',
        p.created_at || '',
        p.status,
      ].join(',')),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `players_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [players, selectedIds]);

  return {
    players,
    loading,
    error,
    page,
    totalPages,
    total,
    sortField,
    sortOrder,
    search,
    filters,
    selectedIds,
    allSelected,
    setSearch,
    setSort,
    setPage,
    setFilters,
    resetFilters,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    refresh,
    exportCsv,
  };
}
