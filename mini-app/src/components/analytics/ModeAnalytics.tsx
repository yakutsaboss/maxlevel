import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Flame, Trophy, Target, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ---- Types ----

interface ModeStreak {
  current: number;
  longest: number;
}

interface ModeAnalyticsData {
  mode_id: number;
  mode_name: string;
  display_name: string;
  icon: string;
  completion_rate: number;
  total_quests: number;
  completed_quests: number;
  xp_earned: number;
  streak: ModeStreak;
}

interface QuestHistoryItem {
  id: number;
  title: string;
  type: string;
  difficulty: string;
  status: string;
  xp_awarded: number;
  date: string;
  completed_at: string | null;
  check_ins: number;
  target: number;
}

interface WeeklyXpItem {
  day: string;
  xp: number;
}

interface ModeDetailData {
  mode: {
    id: number;
    name: string;
    display_name: string;
    icon: string;
  };
  progress: {
    completion_rate: number;
    total_quests: number;
    completed_quests: number;
  };
  streak: {
    current: number;
    longest: number;
    last_activity: string | null;
  };
  weekly_xp: WeeklyXpItem[];
  quest_history: QuestHistoryItem[];
}

interface ModeAnalyticsProps {
  userId: number;
  mode?: string;
}

// ---- Sub-components ----

function ProgressRing({ percent, size = 48 }: { percent: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-telegram-hint/20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-telegram-link"
      />
    </svg>
  );
}

function WeeklyXpChart({ data }: { data: WeeklyXpItem[] }) {
  const maxXp = Math.max(...data.map((d) => d.xp), 1);

  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((item) => {
        const height = Math.max((item.xp / maxXp) * 100, 4);
        const dayLabel = new Date(item.day).toLocaleDateString(undefined, { weekday: 'short' });
        return (
          <div key={item.day} className="flex flex-col items-center flex-1 gap-1">
            <span className="text-[10px] text-telegram-hint">{item.xp}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="w-full rounded-t-sm bg-telegram-link/70 min-h-[2px]"
            />
            <span className="text-[10px] text-telegram-hint">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function QuestHistoryList({ quests }: { quests: QuestHistoryItem[] }) {
  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    skipped: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <div className="space-y-2">
      {quests.slice(0, 10).map((quest) => (
        <div
          key={quest.id}
          className="flex items-center justify-between bg-telegram-secondaryBg rounded-xl px-3 py-2 border border-telegram-hint/10"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-telegram-text truncate">{quest.title}</div>
            <div className="text-xs text-telegram-hint mt-0.5">
              {new Date(quest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {' \u00B7 '}
              {quest.check_ins}/{quest.target} check-ins
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {quest.xp_awarded > 0 && (
              <span className="text-xs font-semibold text-telegram-link">+{quest.xp_awarded} XP</span>
            )}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[quest.status] || 'bg-gray-500/20 text-gray-400'}`}>
              {quest.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Main component ----

/**
 * ModeAnalytics — displays per-mode progress analytics.
 * Shows completion rates, XP earned, active streak, and quest history for each mode.
 */
export function ModeAnalytics({ userId, mode }: ModeAnalyticsProps) {
  const [modesData, setModesData] = useState<ModeAnalyticsData[]>([]);
  const [detailData, setDetailData] = useState<ModeDetailData | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | null>(mode ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : undefined;

  const fetchModes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (initData) headers['X-Telegram-Init-Data'] = initData;

      const res = await fetch(`${API_BASE_URL}/analytics/${userId}/modes`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setModesData(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [userId, initData]);

  const fetchModeDetail = useCallback(async (modeName: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (initData) headers['X-Telegram-Init-Data'] = initData;

      const res = await fetch(`${API_BASE_URL}/analytics/${userId}/modes/${modeName}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDetailData(json.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mode details');
    } finally {
      setLoading(false);
    }
  }, [userId, initData]);

  useEffect(() => {
    if (selectedMode) {
      fetchModeDetail(selectedMode);
    } else {
      fetchModes();
    }
  }, [selectedMode, fetchModes, fetchModeDetail]);

  const handleSelectMode = (modeName: string) => {
    setSelectedMode(modeName);
    setDetailData(null);
  };

  const handleBack = () => {
    setSelectedMode(null);
    setDetailData(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-telegram-hint">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <span className="text-sm">Loading analytics...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-telegram-hint">
        <AlertCircle className="w-8 h-8 mb-2 text-red-400" />
        <span className="text-sm text-red-400">{error}</span>
        <button
          onClick={() => selectedMode ? fetchModeDetail(selectedMode) : fetchModes()}
          className="mt-3 text-sm text-telegram-link underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Detail view for a specific mode
  if (selectedMode && detailData) {
    return (
      <div className="px-4 py-3">
        <button
          onClick={handleBack}
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

  // Overview of all modes
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
            <motion.button
              type="button"
              key={modeItem.mode_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectMode(modeItem.mode_name)}
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
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
