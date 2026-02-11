import { Quest } from '@/types';
import { Zap, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { QuestDifficultyBadge } from '@/components/QuestDifficultyBadge';
import { formatDate } from '@/utils/formatDate';

interface QuestCardProps {
  quest: Quest;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export function QuestCard({ quest, index, isSelected, onClick }: QuestCardProps) {
  const progress = quest.target > 0 ? (quest.progress / quest.target) * 100 : 0;
  const isComplete = quest.status === 'completed';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className={`bg-telegram-secondaryBg rounded-2xl p-4 border-2 transition-all ${isSelected ? 'border-telegram-link shadow-lg' : 'border-transparent'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-telegram-text mb-1 truncate">{quest.title || 'Untitled Quest'}</h3>
          <p className="text-sm text-telegram-hint line-clamp-2">{quest.description || 'No description'}</p>
        </div>
        <div className="ml-3 flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg">
            <Zap className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-bold text-yellow-700">{quest.xp_reward}</span>
          </div>
          {isComplete && <CheckCircle className="w-5 h-5 text-green-500" />}
        </div>
      </div>
      {!isComplete && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-telegram-hint mb-1">
            <span>Progress</span><span>{quest.progress} / {quest.target}</span>
          </div>
          <div className="bg-telegram-hint/20 rounded-full h-2 overflow-hidden">
            <motion.div className={`h-full ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`} initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5, delay: index * 0.05 }} />
          </div>
        </div>
      )}
      {isComplete && quest.completed_at && (
        <div className="text-xs text-telegram-hint mb-3">Completed {formatDate(quest.completed_at)}</div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {quest.difficulty && (
          <QuestDifficultyBadge difficulty={quest.difficulty} />
        )}
        {quest.frequency && (
        <span className="text-xs px-2 py-1 rounded-full bg-telegram-hint/20 text-telegram-hint">{quest.frequency}</span>
        )}
        {quest.mode && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{quest.mode.icon ?? '📋'} {quest.mode.display_name ?? 'Unknown'}</span>
        )}
      </div>
    </motion.div>
  );
}
