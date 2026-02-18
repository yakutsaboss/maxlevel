import { useEffect } from 'react';
import { Quest } from '@/types';
import { Zap, CheckCircle, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckInButton } from '@/components/CheckInButton';
import { QuestDifficultyBadge } from '@/components/QuestDifficultyBadge';
import { FocusTrap } from '@/components/FocusTrap';
import { formatDate } from '@/utils/formatDate';

interface QuestDetailModalProps {
  quest: Quest | null;
  completing: boolean;
  userId: number | undefined;
  onClose: () => void;
  onCheckinSuccess: (result: { completed: boolean; current: number; target: number }) => void;
}

export function QuestDetailModal({ quest, completing, userId, onClose, onCheckinSuccess }: QuestDetailModalProps) {
  useEffect(() => {
    if (!quest) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [quest]);

  if (!quest) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end" onClick={onClose}>
        <FocusTrap onEscape={onClose}>
        <motion.div
          layoutId={`quest-${quest.id}`}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="bg-telegram-secondaryBg rounded-t-3xl w-full p-6 max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1 bg-telegram-hint/30 rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-1">{quest.title || 'Untitled Quest'}</h2>
          <p className="text-telegram-hint text-sm mb-2">{quest.description || 'No description'}</p>
          {quest.target > 1 && (
            <p className="text-sm text-telegram-link font-medium mb-4">
              Check in {quest.target} time{quest.target !== 1 ? 's' : ''} to complete
            </p>
          )}
          {quest.target <= 1 && <div className="mb-2" />}

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
              <Zap className="w-4 h-4" />{quest.xp_reward} XP
            </span>
            {quest.difficulty && (
              <QuestDifficultyBadge difficulty={quest.difficulty} size="md" />
            )}
            <span className="bg-telegram-hint/20 text-telegram-hint px-3 py-1.5 rounded-xl text-sm">
              {quest.frequency}
            </span>
            {quest.mode && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-sm">
                {quest.mode.icon ?? '📋'} {quest.mode.display_name ?? 'Unknown'}
              </span>
            )}
          </div>

          {quest.due_date && (
            <div className="flex items-center gap-2 text-sm text-telegram-hint mb-4">
              <Calendar className="w-4 h-4" />
              <span>Due {formatDate(quest.due_date)}</span>
            </div>
          )}

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-telegram-hint">Progress</span>
              <span className="font-semibold">{quest.progress} / {quest.target}</span>
            </div>
            <div className="bg-telegram-hint/20 rounded-full h-3 overflow-hidden">
              <motion.div
                className={`h-full ${quest.progress >= quest.target ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${quest.target > 0 ? (quest.progress / quest.target) * 100 : 0}%` }}
              />
            </div>
            {quest.target > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                {Array.from({ length: quest.target }, (_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < quest.progress
                        ? 'bg-green-500 text-white'
                        : 'bg-telegram-hint/20 text-telegram-hint'
                    }`}
                  >
                    {i < quest.progress ? '✓' : i + 1}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {quest.status === 'active' && quest.progress < quest.target && userId && (
            <div className="mb-4">
              <CheckInButton
                questInstanceId={quest.id}
                telegramId={userId}
                onSuccess={onCheckinSuccess}
                disabled={completing}
                currentProgress={quest.progress}
                target={quest.target}
              />
            </div>
          )}


          {quest.progress >= quest.target && (
            <div className="bg-green-100 border border-green-300 rounded-2xl p-4 text-center">
              {completing ? (
                <Loader2 className="w-8 h-8 text-green-600 mx-auto mb-2 animate-spin" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              )}
              <p className="text-green-800 font-semibold">{completing ? 'Completing...' : 'Quest Complete!'}</p>
              <p className="text-green-600 text-sm">{completing ? 'Please wait' : 'Tap the button below to claim your reward'}</p>
            </div>
          )}
        </motion.div>
        </FocusTrap>
      </motion.div>
    </AnimatePresence>
  );
}
