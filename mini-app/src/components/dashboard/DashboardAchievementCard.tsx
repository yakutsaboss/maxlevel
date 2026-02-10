import { memo } from 'react';
import { motion } from 'framer-motion';
import { UserAchievement } from '@/types';

export const DashboardAchievementCard = memo(function DashboardAchievementCard({ userAch }: { userAch: UserAchievement }) {
  return (
    <motion.div className="bg-telegram-secondaryBg rounded-xl p-3 border border-telegram-hint/10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="text-3xl text-center mb-2">{userAch.achievement.icon}</div>
      <div className="text-xs font-medium text-center">{userAch.achievement.name}</div>
    </motion.div>
  );
});
