import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ArrowUpDown, MoreVertical, Users, Eye, Gift, Shield,
} from 'lucide-react';
import type { SortField, PlayerRow } from '@/hooks/useAdminPlayers';
import { AVATAR_EMOJI_MAP } from '@/data/avatarOptions';
import { formatRelativeDate, TIER_BADGE_STYLES } from './helpers';

interface AdminPlayerTableProps {
  players: PlayerRow[];
  loading: boolean;
  error: string | null;
  search: string;
  sortField: SortField;
  sortOrder: 'asc' | 'desc';
  selectedIds: Set<number>;
  allSelected: boolean;
  onSort: (field: SortField) => void;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onRowClick: (player: PlayerRow) => void;
  onAwardXp: (player: PlayerRow) => void;
  onChangeTier: (player: PlayerRow) => void;
  onRetry: () => void;
}

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

function KebabMenu({ onView, onAwardXp, onChangeTier }: {
  onView: () => void;
  onAwardXp: () => void;
  onChangeTier: () => void;
}) {
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

const PlayerTableRow = memo(function PlayerTableRow({
  player,
  idx,
  isSelected,
  onToggleSelect,
  onRowClick,
  onAwardXp,
  onChangeTier,
}: {
  player: PlayerRow;
  idx: number;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onRowClick: (player: PlayerRow) => void;
  onAwardXp: (player: PlayerRow) => void;
  onChangeTier: (player: PlayerRow) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: idx * 0.02 }}
      onClick={() => onRowClick(player)}
      className={`grid grid-cols-[32px_40px_1fr_80px_60px_70px_70px_28px] items-center gap-1 px-3 py-2.5 cursor-pointer transition-colors border-b border-white/[0.03] last:border-0 ${
        isSelected ? 'bg-telegram-button/5' : 'hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(player.id)}
          className="w-3.5 h-3.5 rounded border-white/20 accent-telegram-button cursor-pointer"
        />
      </div>

      <div className="flex items-center justify-center">
        <div className="w-7 h-7 rounded-full bg-telegram-bg flex items-center justify-center text-sm">
          {AVATAR_EMOJI_MAP[Number(player.avatar_id)] || '👤'}
        </div>
      </div>

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

      <div className="text-center">
        <span className="text-sm font-semibold text-telegram-text">Lv.{player.level}</span>
      </div>

      <div className="text-center">
        <span className="text-xs text-telegram-hint">{player.xp >= 1000 ? `${(player.xp / 1000).toFixed(1)}k` : player.xp}</span>
      </div>

      <div className="text-center">
        <TierBadge tier={player.tier || 'free'} />
      </div>

      <div className="text-center">
        <span className="text-[10px] text-telegram-hint">{formatRelativeDate(player.last_active)}</span>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <KebabMenu
          onView={() => onRowClick(player)}
          onAwardXp={() => onAwardXp(player)}
          onChangeTier={() => onChangeTier(player)}
        />
      </div>
    </motion.div>
  );
});

export const AdminPlayerTable = memo(function AdminPlayerTable({
  players,
  loading,
  error,
  search,
  sortField,
  sortOrder,
  selectedIds,
  allSelected,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  onAwardXp,
  onChangeTier,
  onRetry,
}: AdminPlayerTableProps) {
  const { t } = useTranslation();

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={onRetry} className="text-xs text-telegram-link hover:underline ml-2">
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-1">
        <div className="bg-telegram-secondaryBg rounded-xl p-3 h-10 skeleton" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-lg p-3 h-14 skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-telegram-secondaryBg rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[32px_40px_1fr_80px_60px_70px_70px_28px] items-center gap-1 px-3 py-2 border-b border-white/5">
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="w-3.5 h-3.5 rounded border-white/20 accent-telegram-button cursor-pointer"
          />
        </div>
        <div className="text-[10px] text-telegram-hint text-center">
          <ArrowUpDown size={10} className="mx-auto opacity-30" />
        </div>
        <SortHeader field="display_name" label={t('admin.players.name', 'Name')} currentField={sortField} currentOrder={sortOrder} onSort={onSort} />
        <SortHeader field="level" label={t('admin.players.level', 'Level')} currentField={sortField} currentOrder={sortOrder} onSort={onSort} className="justify-center" />
        <SortHeader field="xp" label="XP" currentField={sortField} currentOrder={sortOrder} onSort={onSort} className="justify-center" />
        <SortHeader field="tier" label={t('admin.players.tier', 'Tier')} currentField={sortField} currentOrder={sortOrder} onSort={onSort} className="justify-center" />
        <SortHeader field="last_active" label={t('admin.players.lastActive', 'Active')} currentField={sortField} currentOrder={sortOrder} onSort={onSort} className="justify-center" />
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
          <PlayerTableRow
            key={player.id}
            player={player}
            idx={idx}
            isSelected={selectedIds.has(player.id)}
            onToggleSelect={onToggleSelect}
            onRowClick={onRowClick}
            onAwardXp={onAwardXp}
            onChangeTier={onChangeTier}
          />
        ))
      )}
    </div>
  );
});
