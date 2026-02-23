import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram, useMainButton } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { useQuestsData } from '@/hooks/useQuestsData';
import { Target, CheckCircle, Clock, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorSection } from '@/components/ErrorSection';
import { QuestCard } from '@/components/quests/QuestCard';
import { QuestDetailModal } from '@/components/quests/QuestDetailModal';
import { TabButton } from '@/components/quests/TabButton';
import { QuestsSkeleton } from '@/components/quests/QuestsSkeleton';
import { QuestFilters } from '@/components/quests/QuestFilters';
import { QuestCompletionCelebration } from '@/components/celebrations/QuestCompletionCelebration';

export function Quests() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();

  const {
    activeTab, setActiveTab,
    loading, error,
    activeQuests, completedQuests,
    availableModes, currentQuests, completionStats,
    selectedQuest, completing, todayCheckinCount,
    selectedModeId, setSelectedModeId,
    selectedDifficulty, setSelectedDifficulty,
    sortBy, setSortBy,
    handleRefresh, handleQuestSelect, handleCompleteQuest,
    handleCheckinSuccess, closeSelectedQuest, loadQuests,
    mainButtonText, mainButtonVisible, mainButtonActive,
    showQuestCelebration, celebratedQuestName,
  } = useQuestsData(user?.id, haptic);

  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  useMainButton(mainButtonText, handleCompleteQuest, {
    isVisible: mainButtonVisible,
    isActive: mainButtonActive,
  });

  if (loading) return <QuestsSkeleton />;
  if (error) return <ErrorSection message={t('quests.couldNotLoad')} onRetry={loadQuests} />;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 pt-8 pb-6 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
            <Target className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('quests.title')}</h1>
            <p className="text-purple-100 text-sm">{t('quests.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2 bg-white/20 backdrop-blur-sm rounded-2xl p-1" role="tablist" aria-label="Quest tabs">
          <TabButton active={activeTab === 'active'} onClick={() => { setActiveTab('active'); haptic.selection(); }} icon={<Clock className="w-4 h-4" aria-hidden="true" />} label={t('quests.active')} count={activeQuests.length} />
          <TabButton active={activeTab === 'completed'} onClick={() => { setActiveTab('completed'); haptic.selection(); }} icon={<CheckCircle className="w-4 h-4" aria-hidden="true" />} label={t('quests.completed')} count={completedQuests.length} />
        </div>

        {/* Progress summary */}
        <div className="mt-3 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/90 text-xs font-medium">
              {activeTab === 'active'
                ? t('quests.progressReadyToClaim', { done: completionStats.done, total: completionStats.total })
                : t('quests.progressCompleted', { done: completionStats.done, total: completionStats.total })}
            </span>
            {todayCheckinCount > 0 && (
              <span className="flex items-center gap-1 text-white/80 text-xs">
                <CheckCircle className="w-3 h-3 text-green-300" aria-hidden="true" />
                {t('quests.checkinToday', { count: todayCheckinCount })}
              </span>
            )}
          </div>
          <div className="bg-white/20 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow={completionStats.done} aria-valuemin={0} aria-valuemax={completionStats.total} aria-label={`Quest progress: ${completionStats.done} of ${completionStats.total}`}>
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: completionStats.total > 0 ? `${(completionStats.done / completionStats.total) * 100}%` : '0%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Mode filter chips + sort toggle */}
      {availableModes.length > 0 && (
        <QuestFilters
          modes={availableModes}
          selectedModeId={selectedModeId}
          onModeSelect={setSelectedModeId}
          selectedDifficulty={selectedDifficulty}
          onDifficultySelect={setSelectedDifficulty}
          sortBy={sortBy}
          onSortChange={setSortBy}
          haptic={haptic}
        />
      )}

      <div className={`px-4 ${availableModes.length > 0 ? 'mt-2' : 'mt-6'}`}>
        <AnimatePresence mode="wait">
          {currentQuests.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
              {activeTab === 'active' ? (
                <>
                  <div className="text-6xl mb-4" role="img" aria-label="Target">🎯</div>
                  <p className="text-telegram-text font-semibold text-lg mb-2">{t('quests.noActiveQuests')}</p>
                  <p className="text-telegram-hint text-sm mb-6">
                    {selectedModeId !== null
                      ? t('quests.noQuestsForMode')
                      : t('quests.startJourney')}
                  </p>
                  {selectedModeId === null && (
                    <button
                      onClick={() => { haptic.impact('light'); navigate('/settings'); }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-2xl shadow-lg active:scale-95 transition-transform"
                    >
                      {t('quests.exploreModes')}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Trophy className="w-16 h-16 text-telegram-hint/40 mx-auto mb-4" aria-hidden="true" />
                  <p className="text-telegram-text font-semibold text-lg mb-2">{t('quests.noVictoriesYet')}</p>
                  <p className="text-telegram-hint text-sm">
                    {selectedModeId !== null
                      ? t('quests.noCompletedForMode')
                      : t('quests.victoriesAppearHere')}
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {currentQuests.map((quest, index) => (
                <QuestCard key={quest.id} quest={quest} index={index} isSelected={selectedQuest?.id === quest.id} onClick={() => handleQuestSelect(quest)} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedQuest && (
        <QuestDetailModal
          quest={selectedQuest}
          completing={completing}
          userId={user?.id}
          onClose={closeSelectedQuest}
          onCheckinSuccess={handleCheckinSuccess}
        />
      )}

      <QuestCompletionCelebration
        show={showQuestCelebration}
        questName={celebratedQuestName}
      />
    </div>
  );
}
