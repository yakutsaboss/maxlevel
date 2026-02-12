import { motion } from 'framer-motion';

const AVATAR_LABELS: Record<string, string> = {
  gym_warrior: 'Gym Warrior',
  office_boss: 'Office Boss',
  magic_pet: 'Magic Pet',
  night_owl: 'Night Owl',
  couch_hero: 'Couch Hero',
  // Legacy values
  male: 'Warrior',
  female: 'Sorceress',
  other: 'Shapeshifter',
};

interface SummaryStatsProps {
  name: string;
  gender?: string;
}

export function SummaryStats({ name, gender }: SummaryStatsProps) {
  const avatarLabel = AVATAR_LABELS[gender || ''] || gender || 'Unknown';

  return (
    <motion.div
      className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-5 mb-4 shadow-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white text-xl font-bold">{name}</h3>
          <p className="text-purple-200 text-sm">{avatarLabel}</p>
        </div>
        <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center">
          <div className="text-white text-2xl font-bold">1</div>
          <div className="text-purple-200 text-xs">Level</div>
        </div>
      </div>
      <div className="mt-3 bg-white/20 rounded-full h-2">
        <div className="h-full bg-yellow-400 rounded-full" style={{ width: '10%' }} />
      </div>
      <p className="text-purple-200 text-xs mt-1 text-right">0 / 500 XP</p>
    </motion.div>
  );
}
