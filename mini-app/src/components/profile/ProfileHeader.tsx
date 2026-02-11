import { Trophy, Award, Zap, Pencil, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { AVATAR_OPTIONS } from '@/components/ProfileEditModal';
import { UserStats } from '@/types';

interface ProfileHeaderProps {
  stats: UserStats;
  achievementCount: number;
  onEdit: () => void;
  onSettingsClick: () => void;
  haptic: { impact: (...args: any[]) => void };
}

function StatBadge({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <motion.div whileHover={{ scale: 1.1 }} className="text-center" aria-label={`${label}: ${value}`}>
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 mb-2">
        <div className="text-white mb-1" aria-hidden="true">{icon}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
      <div className="text-xs text-purple-100">{label}</div>
    </motion.div>
  );
}

export function ProfileHeader({ stats, achievementCount, onEdit, onSettingsClick, haptic }: ProfileHeaderProps) {
  const avatarIdx = Math.max(0, (stats.user.avatar_id ?? 1) - 1);
  const avatar = AVATAR_OPTIONS[avatarIdx] || AVATAR_OPTIONS[0];

  return (
    <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-6 rounded-b-3xl shadow-lg relative" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
      <button
        onClick={() => { haptic.impact('light'); onSettingsClick(); }}
        className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2 active:scale-90 transition-transform z-10"
        aria-label="Open settings"
      >
        <Settings className="w-5 h-5 text-white" aria-hidden="true" />
      </button>
      <div className="text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="inline-block relative mb-4">
          <div className={`w-24 h-24 ${avatar.color} rounded-full flex items-center justify-center shadow-xl`} role="img" aria-label={`Avatar: ${avatar.icon}`}>
            <span className="text-5xl" aria-hidden="true">{avatar.icon}</span>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-yellow-400 rounded-full px-3 py-1 shadow-lg">
            <span className="text-sm font-bold text-purple-900">Lv {stats.user.level}</span>
          </div>
        </motion.div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-white">{stats.user.first_name} {stats.user.last_name || ''}</h1>
          <button
            onClick={() => { haptic.impact('light'); onEdit(); }}
            className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 active:scale-90 transition-transform"
            aria-label="Edit profile"
          >
            <Pencil className="w-4 h-4 text-white" aria-hidden="true" />
          </button>
        </div>
        {stats.user.username && <p className="text-purple-100 text-sm mb-1">@{stats.user.username}</p>}
        <p className="text-purple-200 text-xs mb-4">
          Joined {new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(stats.user.created_at))}
        </p>
        <div className="bg-white/20 backdrop-blur-sm rounded-full h-6 overflow-hidden mb-4" role="progressbar" aria-valuenow={stats.user.xp} aria-valuemin={0} aria-valuemax={stats.user.xp_to_next_level} aria-label={`XP progress: ${stats.user.xp} of ${stats.user.xp_to_next_level}`}>
          <div className="relative h-full">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${(stats.user.xp / stats.user.xp_to_next_level) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <div className="absolute inset-0 flex items-center justify-center min-w-0 px-2">
              <span className="text-white text-xs font-semibold drop-shadow truncate">
                {stats.user.xp} / {stats.user.xp_to_next_level} XP
              </span>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-6 mt-2">
          <StatBadge icon={<Trophy className="w-5 h-5" />} value={stats.user.total_quests_completed} label="Quests" />
          <StatBadge icon={<Award className="w-5 h-5" />} value={achievementCount} label="Achievements" />
          <StatBadge icon={<Zap className="w-5 h-5" />} value={stats.user.xp} label="Total XP" />
        </div>
      </div>
    </div>
  );
}
