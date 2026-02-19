import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  ArrowUpDown,
  X,
  Users,
  Eye,
  Gift,
  Shield,
} from 'lucide-react';
import { useAdminPlayers, type SortField, type PlayerRow, type PlayerFilters } from '@/hooks/useAdminPlayers';
import { AVATAR_EMOJI_MAP } from '@/data/avatarOptions';
import { Toast } from '@/components/Toast';

function getCredentials(): string {
  return sessionStorage.getItem('admin_credentials') || '';
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const TIER_BADGE_STYLES: Record<string, string> = {
  free: 'bg-gray-500/20 text-gray-400',
  subscriber: 'bg-blue-500/20 text-blue-400',
  premium: 'bg-amber-500/20 text-amber-400',
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${TIER_BADGE_STYLES[tier] || TIER_BADGE_STYLES.free}`}>
      {tier}
    </span>
  );
}

interface SortHeaderProps {
  field: SortField;
  label: string;
  currentField: SortField;
  currentOrder: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  className?: string;
}

function SortHeader({ field, label, currentField, currentOrder, onSort, className = '' }: SortHeaderProps) {
  const isActive = currentField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wider text-telegram-hint hover:text-telegram-text transition-colors ${className}`}
    >
      {label}
      {isActive ? (
        currentOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : (
        <ChevronsUpDown size={12} className="opacity-40" />
      )}
    </button>
  );
}

interface KebabMenuProps {
  userId: number;
  onView: () => void;
  onAwardXp: () => void;
  onChangeTier: () => void;
}

function KebabMenu({ onView, onAwardXp, onChangeTier }: KebabMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded hover:bg-telegram-secondaryBg transition-colors"
      >
        <MoreVertical size={14} className="text-telegram-hint" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1 z-50 bg-telegram-secondaryBg border border-white/10 rounded-lg shadow-lg py-1 min-w-[140px]"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-telegram-text hover:bg-white/5 transition-colors"
              >
                <Eye size={13} /> View
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onAwardXp(); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-telegram-text hover:bg-white/5 transition-colors"
              >
                <Gift size={13} /> Award XP
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onChangeTier(); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-telegram-text hover:bg-white/5 transition-colors"
              >
                <Shield size={13} /> Change Tier
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FilterPanelProps {
  filters: PlayerFilters;
  onChange: (f: PlayerFilters) => void;
  onReset: () => void;
  onClose: () => void;
}

function FilterPanel({ filters, onChange, onReset, onClose }: FilterPanelProps) {
  const { t } = useTranslation();
  const update = (key: keyof PlayerFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasFilters = Object.values(filters).some((v) => v !== '');

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="bg-telegram-secondaryBg rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-telegram-hint uppercase tracking-wider">
            {t('admin.players.filters', 'Filters')}
          </span>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button onClick={onReset} className="text-[10px] text-telegram-link hover:underline">
                {t('admin.players.resetFilters', 'Reset')}
              </button>
            )}
            <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10">
              <X size={14} className="text-telegram-hint" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Tier */}
          <div>
            <label className="text-[10px] text-telegram-hint mb-0.5 block">{t('admin.players.tier', 'Tier')}</label>
            <select
              value={filters.tier}
              onChange={(e) => update('tier', e.target.value)}
              className="w-full bg-telegram-bg text-telegram-text text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:border-telegram-link"
            >
              <option value="">All</option>
              <option value="free">Free</option>
              <option value="subscriber">Subscriber</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          {/* Mode */}
          <div>
            <label className="text-[10px] text-telegram-hint mb-0.5 block">{t('admin.players.mode', 'Mode')}</label>
            <select
              value={filters.mode}
              onChange={(e) => update('mode', e.target.value)}
              className="w-full bg-telegram-bg text-telegram-text text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:border-telegram-link"
            >
              <option value="">All</option>
              <option value="fitness">Fitness</option>
              <option value="finance">Finance</option>
              <option value="productivity">Productivity</option>
              <option value="discipline">Discipline</option>
              <option value="social">Social</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] text-telegram-hint mb-0.5 block">{t('admin.players.status', 'Status')}</label>
            <select
              value={filters.status}
              onChange={(e) => update('status', e.target.value)}
              className="w-full bg-telegram-bg text-telegram-text text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:border-telegram-link"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Level Range */}
          <div>
            <label className="text-[10px] text-telegram-hint mb-0.5 block">{t('admin.players.level', 'Level Range')}</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={filters.levelMin}
                onChange={(e) => update('levelMin', e.target.value)}
                placeholder="Min"
                className="w-1/2 bg-telegram-bg text-telegram-text text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:border-telegram-link"
              />
              <span className="text-telegram-hint text-[10px]">–</span>
              <input
                type="number"
                min={0}
                value={filters.levelMax}
                onChange={(e) => update('levelMax', e.target.value)}
                placeholder="Max"
                className="w-1/2 bg-telegram-bg text-telegram-text text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:border-telegram-link"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="col-span-2">
            <label className="text-[10px] text-telegram-hint mb-0.5 block">{t('admin.players.joined', 'Joined Date Range')}</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => update('dateFrom', e.target.value)}
                className="w-1/2 bg-telegram-bg text-telegram-text text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:border-telegram-link"
              />
              <span className="text-telegram-hint text-[10px]">to</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => update('dateTo', e.target.value)}
                className="w-1/2 bg-telegram-bg text-telegram-text text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:border-telegram-link"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function AdminPlayerList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const credentials = getCredentials();
  const {
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
  } = useAdminPlayers(credentials);

  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== '').length,
    [filters],
  );

  const handleRowClick = useCallback((player: PlayerRow) => {
    navigate(`/admin/players/${player.id}`);
  }, [navigate]);

  const handleExport = useCallback(() => {
    exportCsv();
    setToast({ message: `Exported ${selectedIds.size > 0 ? selectedIds.size : players.length} players`, variant: 'success' });
  }, [exportCsv, selectedIds.size, players.length]);

  if (!credentials) {
    navigate('/admin');
    return null;
  }

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text">
      {/* Header */}
      <div className="bg-telegram-secondaryBg px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-telegram-button" />
            <h1 className="text-lg font-bold">{t('admin.players.title', 'Players')}</h1>
            {total > 0 && (
              <span className="text-xs text-telegram-hint bg-white/5 px-2 py-0.5 rounded-full">
                {total.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-telegram-button/10 text-telegram-button rounded-lg text-xs font-medium hover:bg-telegram-button/20 transition-colors"
            >
              <Download size={13} />
              {t('admin.players.export', 'CSV')}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-telegram-hint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.players.search', 'Search by name or Telegram ID...')}
              className="w-full bg-telegram-bg text-telegram-text text-sm rounded-xl pl-9 pr-3 py-2 border border-white/10 focus:outline-none focus:border-telegram-link placeholder:text-telegram-hint/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10"
              >
                <X size={12} className="text-telegram-hint" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors border ${
              showFilters || activeFilterCount > 0
                ? 'bg-telegram-button/10 text-telegram-button border-telegram-button/30'
                : 'bg-telegram-bg text-telegram-hint border-white/10 hover:text-telegram-text'
            }`}
          >
            <Filter size={13} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-telegram-button text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onReset={resetFilters}
              onClose={() => setShowFilters(false)}
            />
          )}
        </AnimatePresence>

        {/* Selected rows indicator */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-between bg-telegram-button/10 border border-telegram-button/20 rounded-xl px-3 py-2"
            >
              <span className="text-xs text-telegram-button font-medium">
                {t('admin.players.selectedCount', '{{count}} selected', { count: selectedIds.size })}
              </span>
              <button onClick={clearSelection} className="text-[10px] text-telegram-hint hover:text-telegram-text">
                {t('admin.players.clearSelection', 'Clear')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={refresh} className="text-xs text-telegram-link hover:underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-1">
            <div className="bg-telegram-secondaryBg rounded-xl p-3 h-10 skeleton" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-telegram-secondaryBg rounded-lg p-3 h-14 skeleton" />
            ))}
          </div>
        )}

        {/* Data table */}
        {!loading && !error && (
          <div className="bg-telegram-secondaryBg rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[32px_40px_1fr_80px_60px_70px_70px_28px] items-center gap-1 px-3 py-2 border-b border-white/5">
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-white/20 accent-telegram-button cursor-pointer"
                />
              </div>
              <div className="text-[10px] text-telegram-hint text-center">
                <ArrowUpDown size={10} className="mx-auto opacity-30" />
              </div>
              <SortHeader field="display_name" label={t('admin.players.name', 'Name')} currentField={sortField} currentOrder={sortOrder} onSort={setSort} />
              <SortHeader field="level" label={t('admin.players.level', 'Level')} currentField={sortField} currentOrder={sortOrder} onSort={setSort} className="justify-center" />
              <SortHeader field="xp" label="XP" currentField={sortField} currentOrder={sortOrder} onSort={setSort} className="justify-center" />
              <SortHeader field="tier" label={t('admin.players.tier', 'Tier')} currentField={sortField} currentOrder={sortOrder} onSort={setSort} className="justify-center" />
              <SortHeader field="last_active" label={t('admin.players.lastActive', 'Active')} currentField={sortField} currentOrder={sortOrder} onSort={setSort} className="justify-center" />
              <div />
            </div>

            {/* Table rows */}
            {players.length === 0 ? (
              <div className="text-center py-10 text-telegram-hint text-sm">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                {search
                  ? t('admin.players.noPlayersFound', 'No players found')
                  : t('admin.players.noPlayers', 'No players yet')}
              </div>
            ) : (
              players.map((player, idx) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => handleRowClick(player)}
                  className={`grid grid-cols-[32px_40px_1fr_80px_60px_70px_70px_28px] items-center gap-1 px-3 py-2.5 cursor-pointer transition-colors border-b border-white/[0.03] last:border-0 ${
                    selectedIds.has(player.id) ? 'bg-telegram-button/5' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(player.id)}
                      onChange={() => toggleSelect(player.id)}
                      className="w-3.5 h-3.5 rounded border-white/20 accent-telegram-button cursor-pointer"
                    />
                  </div>

                  {/* Avatar */}
                  <div className="flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-telegram-bg flex items-center justify-center text-sm">
                      {AVATAR_EMOJI_MAP[Number(player.avatar_id)] || '👤'}
                    </div>
                  </div>

                  {/* Name + TG ID + Modes */}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-telegram-text truncate">
                      {player.display_name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-telegram-hint">
                        #{player.telegram_id}
                      </span>
                      {player.active_modes?.length > 0 && (
                        <span className="text-[10px] text-telegram-hint/60 truncate">
                          {player.active_modes.slice(0, 2).join(', ')}
                          {player.active_modes.length > 2 && ` +${player.active_modes.length - 2}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Level */}
                  <div className="text-center">
                    <span className="text-sm font-semibold text-telegram-text">Lv.{player.level}</span>
                  </div>

                  {/* XP */}
                  <div className="text-center">
                    <span className="text-xs text-telegram-hint">{player.xp >= 1000 ? `${(player.xp / 1000).toFixed(1)}k` : player.xp}</span>
                  </div>

                  {/* Tier */}
                  <div className="text-center">
                    <TierBadge tier={player.tier || 'free'} />
                  </div>

                  {/* Last Active */}
                  <div className="text-center">
                    <span className="text-[10px] text-telegram-hint">{formatRelativeDate(player.last_active)}</span>
                  </div>

                  {/* Kebab */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <KebabMenu
                      userId={player.id}
                      onView={() => handleRowClick(player)}
                      onAwardXp={() => navigate(`/admin/players/${player.id}?action=award-xp`)}
                      onChangeTier={() => navigate(`/admin/players/${player.id}?action=change-tier`)}
                    />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-telegram-hint">
              {t('admin.players.showingPage', 'Page {{page}} of {{total}}', { page, total: totalPages })}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg text-telegram-hint hover:text-telegram-text hover:bg-telegram-secondaryBg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
                <ChevronLeft size={14} className="-ml-2.5" />
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg text-telegram-hint hover:text-telegram-text hover:bg-telegram-secondaryBg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page numbers */}
              {generatePageNumbers(page, totalPages).map((pNum, i) => (
                pNum === -1 ? (
                  <span key={`dots-${i}`} className="px-1 text-telegram-hint text-xs">...</span>
                ) : (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      pNum === page
                        ? 'bg-telegram-button text-telegram-buttonText'
                        : 'text-telegram-hint hover:text-telegram-text hover:bg-telegram-secondaryBg'
                    }`}
                  >
                    {pNum}
                  </button>
                )
              ))}

              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-telegram-hint hover:text-telegram-text hover:bg-telegram-secondaryBg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-telegram-hint hover:text-telegram-text hover:bg-telegram-secondaryBg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
                <ChevronRight size={14} className="-ml-2.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}

function generatePageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: number[] = [];
  pages.push(1);

  if (current > 3) pages.push(-1); // dots

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push(-1); // dots

  pages.push(total);
  return pages;
}
