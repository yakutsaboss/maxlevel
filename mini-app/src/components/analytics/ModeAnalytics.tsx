import { AnimatePresence } from 'framer-motion';
import { BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { useModeAnalytics } from '@/components/analytics/useModeAnalytics';
import { ModeDetailView, ModeOverviewCard } from '@/components/analytics/ModeStatsCard';

interface ModeAnalyticsProps {
  userId: number;
  mode?: string;
}

export function ModeAnalytics({ userId, mode }: ModeAnalyticsProps) {
  const {
    modesData,
    detailData,
    selectedMode,
    loading,
    error,
    handleSelectMode,
    handleBack,
    retry,
  } = useModeAnalytics(userId, mode);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-telegram-hint">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <span className="text-sm">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-telegram-hint">
        <AlertCircle className="w-8 h-8 mb-2 text-red-400" />
        <span className="text-sm text-red-400">{error}</span>
        <button onClick={retry} className="mt-3 text-sm text-telegram-link underline">
          Retry
        </button>
      </div>
    );
  }

  if (selectedMode && detailData) {
    return <ModeDetailView detailData={detailData} onBack={handleBack} />;
  }

  return (
    <div className="px-4 py-3">
      <h2 className="text-lg font-semibold text-telegram-text mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-telegram-link" />
        Mode Analytics
      </h2>

      {modesData.length === 0 && (
        <p className="text-sm text-telegram-hint text-center py-8">No active modes found</p>
      )}

      <AnimatePresence>
        <div className="space-y-3">
          {modesData.map((modeItem, index) => (
            <ModeOverviewCard
              key={modeItem.mode_id}
              modeItem={modeItem}
              index={index}
              onSelect={handleSelectMode}
            />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
