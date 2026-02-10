import { memo } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Quest } from '@/types';
import { QuestDifficultyBadge } from '@/components/QuestDifficultyBadge';

export const QuestCardMini = memo(function QuestCardMini({ quest, onClick }: { quest: Quest; onClick: () => void }) {
  return (
    <motion.div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10" whileHover={{ scale: 1.02 }} onClick={onClick}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-telegram-text truncate">{quest.title}</h3>
          <p className="text-sm text-telegram-hint mt-1 line-clamp-2">{quest.description}</p>
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-semibold text-yellow-600">{quest.xp_reward}</span>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-telegram-hint mb-1"><span>Progress</span><span>{quest.progress} / {quest.target}</span></div>
        <div className="bg-telegram-hint/20 rounded-full h-2 overflow-hidden">
          <motion.div className="h-full bg-telegram-link" initial={{ width: 0 }} animate={{ width: `${(quest.progress / quest.target) * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <QuestDifficultyBadge difficulty={quest.difficulty} />
        <span className="text-xs text-telegram-hint">{quest.frequency}</span>
      </div>
    </motion.div>
  );
});
