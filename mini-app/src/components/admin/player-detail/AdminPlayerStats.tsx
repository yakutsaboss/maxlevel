import { memo } from 'react';
import { motion } from 'framer-motion';
import { Target, Flame, Trophy, Zap, Dumbbell, BookOpen } from 'lucide-react';
import type { PlayerDetailData } from './types';

interface AdminPlayerStatsProps {
  data: PlayerDetailData;
}

export const AdminPlayerStats = memo(function AdminPlayerStats({ data }: AdminPlayerStatsProps) {
  const { stats } = data;
  const cards = [
    { label: 'Total Quests', value: stats.total_quests, icon: <Target size={16} className="text-green-400" />, color: 'bg-green-500/15' },
    { label: 'Streak', value: `${data.user.current_streak}d`, icon: <Flame size={16} className="text-orange-400" />, color: 'bg-orange-500/15' },
    { label: 'Achievements', value: stats.total_achievements, icon: <Trophy size={16} className="text-yellow-400" />, color: 'bg-yellow-500/15' },
    { label: 'Total XP', value: stats.total_xp_earned.toLocaleString(), icon: <Zap size={16} className="text-blue-400" />, color: 'bg-blue-500/15' },
    { label: 'Activities', value: stats.total_activities, icon: <Dumbbell size={16} className="text-purple-400" />, color: 'bg-purple-500/15' },
    { label: 'Articles Read', value: stats.articles_read, icon: <BookOpen size={16} className="text-teal-400" />, color: 'bg-teal-500/15' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="bg-telegram-secondaryBg rounded-xl p-3 border border-telegram-hint/10"
        >
          <div className={`w-8 h-8 ${card.color} rounded-lg flex items-center justify-center mb-2`}>
            {card.icon}
          </div>
          <div className="text-lg font-bold text-telegram-text">{card.value}</div>
          <div className="text-[11px] text-telegram-hint">{card.label}</div>
        </motion.div>
      ))}
    </div>
  );
});
