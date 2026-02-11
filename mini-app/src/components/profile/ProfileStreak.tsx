import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileStreakProps {
  currentStreak: number;
  longestStreak: number;
}

export function ProfileStreak({ currentStreak, longestStreak }: ProfileStreakProps) {
  return (
    <div className="px-4 mt-6" role="region" aria-label={`Streak: ${currentStreak} days current, ${longestStreak} days best`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5" aria-hidden="true" />
              <h3 className="font-semibold">Streak</h3>
            </div>
            <div className="text-3xl font-bold">{currentStreak} days</div>
            <p className="text-sm text-orange-100 mt-1">Best: {longestStreak} days</p>
          </div>
          <div className="text-6xl" role="img" aria-label="Fire streak">🔥</div>
        </div>
      </motion.div>
    </div>
  );
}
