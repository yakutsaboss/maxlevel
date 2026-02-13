import { motion } from 'framer-motion';
import { BarChart3, Flame, Trophy, Target, ChevronRight } from 'lucide-react';
import { ProgressRing, WeeklyXpChart, QuestHistoryList } from '@/components/analytics/ModeChart';
import type { ModeAnalyticsData, ModeDetailData } from '@/components/analytics/useModeAnalytics';

// ---- Detail view ----

interface ModeDetailViewProps {
  detailData: ModeDetailData;
  onBack: () => void;
}

export function ModeDetailView({ detailData, onBack }: ModeDetailViewProps) {
  return (
    <div className="px-4 py-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-telegram-link mb-4"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to all modes
      </button>

      {/* Mode header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-4xl" role="img" aria-label={detailData.mode.display_name}>
          {detailData.mode.icon}
        </span>
        <div>
          <h2 className="text-lg font-bold text-telegram-text">{detailData.mode.display_name}</h2>
          <p className="text-xs text-telegram-hint">Detailed progress analytics</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-telegram-secondaryBg rounded-xl p-3 text-center border border-telegram-hint/10">
          <Target className="w-5 h-5 mx-auto mb-1 text-telegram-link" />
          <div className="text-lg font-bold text-telegram-text">{detailData.progress.completion_rate}%</div>
          <div className="text-[10px] text-telegram-hint">Completion</div>
        </div>
        <div className="bg-telegram-secondaryBg rounded-xl p-3 text-center border border-telegram-hint/10">
          <Flame className="w-5 h-5 mx-auto mb-1 text-orange-400" />
          <div className="text-lg font-bold text-telegram-text">{detailData.streak.current}</div>
          <div className="text-[10px] text-telegram-hint">Streak</div>
        </div>
        <div className="bg-telegram-secondaryBg rounded-xl p-3 text-center border border-telegram-hint/10">
          <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
          <div className="text-lg font-bold text-telegram-text">{detailData.streak.longest}</div>
          <div className="text-[10px] text-telegram-hint">Best streak</div>
        </div>
      </div>

      {/* Weekly XP chart */}
      {detailData.weekly_xp.length > 0 && (
        <div className="bg-telegram-secondaryBg rounded-2xl p-4 mb-5 border border-telegram-hint/10">
          <h3 className="text-sm font-semibold text-telegram-text mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-telegram-link" />
            Weekly XP
          </h3>
          <WeeklyXpChart data={detailData.weekly_xp} />
        </div>
      )}

      {/* Quest history */}
      {detailData.quest_history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-telegram-text mb-3">Recent Quests</h3>
          <QuestHistoryList quests={detailData.quest_history} />
        </div>
      )}

      {detailData.quest_history.length === 0 && (
        <p className="text-sm text-telegram-hint text-center py-6">No quest history yet</p>
      )}
    </div>
  );
}

// ---- Overview card ----

interface ModeOverviewCardProps {
  modeItem: ModeAnalyticsData;
  index: number;
  onSelect: (modeName: string) => void;
}

export function ModeOverviewCard({ modeItem, index, onSelect }: ModeOverviewCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(modeItem.mode_name)}
      className="w-full bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 text-left"
      aria-label={`${modeItem.display_name}: ${modeItem.completion_rate}% complete, ${modeItem.xp_earned} XP`}
    >
      <div className="flex items-center gap-3">
        {/* Icon + progress ring */}
        <div className="relative flex items-center justify-center">
          <ProgressRing percent={modeItem.completion_rate} size={48} />
          <span className="absolute text-xl" role="img" aria-label={modeItem.display_name}>
            {modeItem.icon}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-telegram-text">{modeItem.display_name}</h3>
            <ChevronRight className="w-4 h-4 text-telegram-hint" />
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-telegram-hint">
            <span>{modeItem.completion_rate}% complete</span>
            <span>{modeItem.xp_earned} XP</span>
            {modeItem.streak.current > 0 && (
              <span className="text-orange-400 font-medium">
                {'\uD83D\uDD25'}{modeItem.streak.current}d
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-telegram-hint/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${modeItem.completion_rate}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-telegram-link rounded-full"
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
