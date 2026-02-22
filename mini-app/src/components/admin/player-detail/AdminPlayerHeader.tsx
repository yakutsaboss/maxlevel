import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, ChevronRight, Calendar } from 'lucide-react';
import { formatDate } from '@/utils/formatDate';
import { tierColor, xpForLevel } from './helpers';
import type { PlayerUser } from './types';

interface AdminPlayerHeaderProps {
  user: PlayerUser;
}

export const AdminPlayerHeader = memo(function AdminPlayerHeader({ user }: AdminPlayerHeaderProps) {
  const navigate = useNavigate();
  const xpNeeded = xpForLevel(user.level);
  const xpProgress = xpNeeded > 0 ? Math.min((user.xp % xpNeeded) / xpNeeded * 100, 100) : 0;

  return (
    <>
      {/* Breadcrumb */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-telegram-link"
        >
          <ArrowLeft size={16} />
          <span>Players</span>
          <ChevronRight size={12} className="text-telegram-hint" />
          <span className="text-telegram-text font-medium truncate max-w-[180px]">
            {user.display_name || user.first_name}
          </span>
        </button>
      </div>

      {/* Player Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 bg-telegram-button/10 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={28} className="text-telegram-button" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-telegram-text truncate">
                {user.display_name || user.first_name}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tierColor(user.tier)}`}>
                {user.tier}
              </span>
            </div>
            <div className="text-sm text-telegram-hint">
              {user.username ? `@${user.username}` : `ID: ${user.telegram_id}`}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-telegram-hint flex items-center gap-1">
                <Calendar size={10} /> {formatDate(user.created_at)}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                user.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
              }`}>
                {user.status}
              </span>
            </div>
          </div>
        </div>

        {/* Level + XP bar */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-telegram-hint">Lv.{user.level}</span>
          <div className="flex-1 h-2 bg-telegram-bg rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-telegram-button to-telegram-link rounded-full"
            />
          </div>
          <span className="text-xs text-telegram-hint">{user.xp.toLocaleString()} XP</span>
        </div>
      </motion.div>
    </>
  );
});
