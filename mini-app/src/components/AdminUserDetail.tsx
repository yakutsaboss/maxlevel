import { ArrowLeft, User } from 'lucide-react';
import { motion } from 'framer-motion';

export interface UserDetail {
  id: number;
  telegram_id: number;
  display_name: string;
  username: string | null;
  xp: number;
  level: number;
  streak_days: number;
  active_modes: string[];
  quests_completed: number;
  achievements_unlocked: number;
  created_at: string;
  last_active: string;
}

interface AdminUserDetailProps {
  user: UserDetail;
  onBack: () => void;
}

export function AdminUserDetail({ user, onBack }: AdminUserDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-telegram-link"
      >
        <ArrowLeft size={16} />
        Back to list
      </button>

      <div className="bg-telegram-secondaryBg rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-telegram-button/10 rounded-full flex items-center justify-center">
            <User size={24} className="text-telegram-button" />
          </div>
          <div>
            <div className="font-bold text-telegram-text">{user.display_name}</div>
            <div className="text-sm text-telegram-hint">
              {user.username ? `@${user.username}` : `ID: ${user.telegram_id}`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Level', value: user.level },
            { label: 'XP', value: user.xp.toLocaleString() },
            { label: 'Streak', value: `${user.streak_days}d` },
            { label: 'Quests Done', value: user.quests_completed },
            { label: 'Achievements', value: user.achievements_unlocked },
            { label: 'Telegram ID', value: user.telegram_id },
          ].map((item) => (
            <div key={item.label} className="bg-telegram-bg rounded-lg p-3">
              <div className="text-xs text-telegram-hint">{item.label}</div>
              <div className="font-semibold text-telegram-text">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-xs text-telegram-hint">Active Modes</div>
          <div className="flex flex-wrap gap-1.5">
            {user.active_modes.length > 0 ? (
              user.active_modes.map((mode) => (
                <span key={mode} className="px-2 py-1 bg-telegram-button/10 text-telegram-button text-xs rounded-lg">
                  {mode}
                </span>
              ))
            ) : (
              <span className="text-sm text-telegram-hint">No active modes</span>
            )}
          </div>
        </div>

        <div className="flex justify-between text-xs text-telegram-hint pt-2 border-t border-telegram-hint/10">
          <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
          <span>Last active: {new Date(user.last_active).toLocaleDateString()}</span>
        </div>
      </div>
    </motion.div>
  );
}
