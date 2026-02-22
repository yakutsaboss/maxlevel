import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminPlayers, type PlayerRow } from '@/hooks/useAdminPlayers';
import { Toast } from '@/components/Toast';
import { AdminPlayerSearch } from '@/components/admin/player-list/AdminPlayerSearch';
import { AdminPlayerTable } from '@/components/admin/player-list/AdminPlayerTable';
import { AdminBulkActions } from '@/components/admin/player-list/AdminBulkActions';
import { generatePageNumbers } from '@/components/admin/player-list/helpers';

function getCredentials(): string {
  return sessionStorage.getItem('admin_credentials') || '';
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

  const handleAwardXp = useCallback((player: PlayerRow) => {
    navigate(`/admin/players/${player.id}?action=award-xp`);
  }, [navigate]);

  const handleChangeTier = useCallback((player: PlayerRow) => {
    navigate(`/admin/players/${player.id}?action=change-tier`);
  }, [navigate]);

  const handleExport = useCallback(() => {
    exportCsv();
    setToast({ message: `Exported ${selectedIds.size > 0 ? selectedIds.size : players.length} players`, variant: 'success' });
  }, [exportCsv, selectedIds.size, players.length]);

  const handleToggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

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

        <AdminPlayerSearch
          search={search}
          onSearchChange={setSearch}
          showFilters={showFilters}
          onToggleFilters={handleToggleFilters}
          activeFilterCount={activeFilterCount}
          filters={filters}
          onFiltersChange={setFilters}
          onResetFilters={resetFilters}
        />
      </div>

      <div className="p-3 space-y-3">
        <AdminBulkActions
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
        />

        <AdminPlayerTable
          players={players}
          loading={loading}
          error={error}
          search={search}
          sortField={sortField}
          sortOrder={sortOrder}
          selectedIds={selectedIds}
          allSelected={allSelected}
          onSort={setSort}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onRowClick={handleRowClick}
          onAwardXp={handleAwardXp}
          onChangeTier={handleChangeTier}
          onRetry={refresh}
        />

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
