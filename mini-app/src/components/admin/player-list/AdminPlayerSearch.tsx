import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X } from 'lucide-react';
import type { PlayerFilters } from '@/hooks/useAdminPlayers';

interface AdminPlayerSearchProps {
  search: string;
  onSearchChange: (q: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  filters: PlayerFilters;
  onFiltersChange: (f: PlayerFilters) => void;
  onResetFilters: () => void;
}

export const AdminPlayerSearch = memo(function AdminPlayerSearch({
  search,
  onSearchChange,
  showFilters,
  onToggleFilters,
  activeFilterCount,
  filters,
  onFiltersChange,
  onResetFilters,
}: AdminPlayerSearchProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-telegram-hint" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('admin.players.search', 'Search by name or Telegram ID...')}
            className="w-full bg-telegram-bg text-telegram-text text-sm rounded-xl pl-9 pr-3 py-2 border border-white/10 focus:outline-none focus:border-telegram-link placeholder:text-telegram-hint/50"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10"
            >
              <X size={12} className="text-telegram-hint" />
            </button>
          )}
        </div>
        <button
          onClick={onToggleFilters}
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

      <AnimatePresence>
        {showFilters && (
          <FilterPanel
            filters={filters}
            onChange={onFiltersChange}
            onReset={onResetFilters}
            onClose={onToggleFilters}
          />
        )}
      </AnimatePresence>
    </>
  );
});

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
