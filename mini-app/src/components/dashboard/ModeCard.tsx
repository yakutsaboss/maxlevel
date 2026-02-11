import { memo } from 'react';
import { motion } from 'framer-motion';
import { UserMode } from '@/types';

export const ModeCard = memo(function ModeCard({ userMode }: { userMode: UserMode }) {
  return (
    <motion.div className="flex-shrink-0 bg-telegram-secondaryBg rounded-xl px-4 py-2 border border-telegram-hint/20" whileHover={{ scale: 1.05 }} aria-label={`Mode: ${userMode.mode.display_name}`}>
      <div className="text-2xl mb-1" role="img" aria-label={userMode.mode.display_name}>{userMode.mode.icon}</div>
      <div className="text-sm font-medium">{userMode.mode.display_name}</div>
    </motion.div>
  );
});
