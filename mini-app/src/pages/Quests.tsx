import { useEffect, useState } from 'react';
import { useTelegram, useMainButton } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { Quest } from '@/types';
import { Target, Zap, CheckCircle, Clock, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type QuestTab = 'active' | 'completed';

export function Quests() {
  const { user, haptic } = useTelegram();
  const [activeTab, setActiveTab] = useState<QuestTab>('active');
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  useEffect(() => {
    loadQuests();
  }, [user]);

  const loadQuests = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [activeRes, completedRes] = await Promise.all([
        apiClient.getActiveQuests(user.id),
        apiClient.getCompletedQuests(user.id, 50),
      ]);

      if (activeRes.success && activeRes.data) {
        setActiveQuests(activeRes.data);
      }
      if (completedRes.success && completedRes.data) {
        setCompletedQuests(completedRes.data);
      }
    } catch (error) {
      console.error('Failed to load quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestSelect = (quest: Quest) => {
    haptic.impact('light');
    setSelectedQuest(quest);
  };

  const handleCompleteQuest = async () => {
    if (!selectedQuest) return;

    try {
      haptic.notification('success');
      const response = await apiClient.completeQuest(selectedQuest.id, selectedQuest.target);

      if (response.success) {
        // Reload quests
        await loadQuests();
        setSelectedQuest(null);
      }
    } catch (error) {
      console.error('Failed to complete quest:', error);
      haptic.notification('error');
    }
  };

  // Show MainButton when quest is selected
  useMainButton(
    selectedQuest ? 'Complete Quest' : '',
    handleCompleteQuest,
    {
      isVisible: !!selectedQuest && selectedQuest.progress >= selectedQuest.target,
      isActive: true,
    }
  );

  const currentQuests = activeTab === 'active' ? activeQuests : completedQuests;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg">
        <div className="text-telegram-hint">Loading quests...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Quests</h1>
            <p className="text-purple-100 text-sm">Complete quests to level up</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white/20 backdrop-blur-sm rounded-2xl p-1">
          <TabButton
            active={activeTab === 'active'}
            onClick={() => {
              setActiveTab('active');
              haptic.selection();
            }}
            icon={<Clock className="w-4 h-4" />}
            label="Active"
            count={activeQuests.length}
          />
          <TabButton
            active={activeTab === 'completed'}
            onClick={() => {
              setActiveTab('completed');
              haptic.selection();
            }}
            icon={<CheckCircle className="w-4 h-4" />}
            label="Completed"
            count={completedQuests.length}
          />
        </div>
      </div>

      {/* Quest List */}
      <div className="px-4 mt-6">
        <AnimatePresence mode="wait">
          {currentQuests.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">
                {activeTab === 'active' ? '🎯' : '✅'}
              </div>
              <p className="text-telegram-hint">
                {activeTab === 'active'
                  ? 'No active quests. Check back later!'
                  : 'No completed quests yet. Start your journey!'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {currentQuests.map((quest, index) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  index={index}
                  isSelected={selectedQuest?.id === quest.id}
                  onClick={() => handleQuestSelect(quest)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quest Details Modal */}
      <AnimatePresence>
        {selectedQuest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setSelectedQuest(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-telegram-secondaryBg rounded-t-3xl w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-telegram-hint/30 rounded-full mx-auto mb-4" />

              <h2 className="text-xl font-bold mb-2">{selectedQuest.title}</h2>
              <p className="text-telegram-hint mb-4">{selectedQuest.description}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <InfoBox icon={<Zap />} label="XP Reward" value={selectedQuest.xp_reward} />
                <InfoBox
                  icon={<Trophy />}
                  label="Difficulty"
                  value={selectedQuest.difficulty}
                />
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-telegram-hint">Progress</span>
                  <span className="font-semibold">
                    {selectedQuest.progress} / {selectedQuest.target}
                  </span>
                </div>
                <div className="bg-telegram-hint/20 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(selectedQuest.progress / selectedQuest.target) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {selectedQuest.progress >= selectedQuest.target && (
                <div className="bg-green-100 border border-green-300 rounded-2xl p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-semibold">Quest Complete!</p>
                  <p className="text-green-600 text-sm">
                    Tap the button below to claim your reward
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-medium transition-all ${
        active
          ? 'bg-white text-blue-600 shadow-lg'
          : 'text-white/70 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${
          active ? 'bg-blue-100' : 'bg-white/20'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// Quest Card Component
function QuestCard({
  quest,
  index,
  isSelected,
  onClick,
}: {
  quest: Quest;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const progress = (quest.progress / quest.target) * 100;
  const isComplete = quest.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-telegram-secondaryBg rounded-2xl p-4 border-2 transition-all ${
        isSelected
          ? 'border-telegram-link shadow-lg'
          : 'border-transparent'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-telegram-text mb-1">{quest.title}</h3>
          <p className="text-sm text-telegram-hint line-clamp-2">{quest.description}</p>
        </div>
        <div className="ml-3 flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg">
            <Zap className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-bold text-yellow-700">
              {quest.xp_reward}
            </span>
          </div>
          {isComplete && <CheckCircle className="w-5 h-5 text-green-500" />}
        </div>
      </div>

      {/* Progress Bar */}
      {!isComplete && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-telegram-hint mb-1">
            <span>Progress</span>
            <span>
              {quest.progress} / {quest.target}
            </span>
          </div>
          <div className="bg-telegram-hint/20 rounded-full h-2 overflow-hidden">
            <motion.div
              className={`h-full ${
                progress === 100
                  ? 'bg-green-500'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            quest.difficulty === 'easy'
              ? 'bg-green-100 text-green-700'
              : quest.difficulty === 'medium'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {quest.difficulty}
        </span>
        <span className="text-xs px-2 py-1 rounded-full bg-telegram-hint/20 text-telegram-hint">
          {quest.frequency}
        </span>
        {quest.mode && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
            {quest.mode.icon} {quest.mode.display_name}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// Info Box Component
function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-telegram-bg rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-telegram-link">{icon}</div>
        <span className="text-xs text-telegram-hint">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
