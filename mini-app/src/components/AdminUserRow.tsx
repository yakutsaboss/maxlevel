import { User } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminUserRowProps {
  user: {
    display_name: string;
    level: number;
    xp: number;
    active_modes: string[];
    last_active: string;
  };
  onClick: () => void;
}

export function AdminUserRow({ user, onClick }: AdminUserRowProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="w-full bg-telegram-secondaryBg rounded-xl p-3 flex items-center gap-3 text-left"
    >
      <div className="w-9 h-9 bg-telegram-button/10 rounded-full flex items-center justify-center flex-shrink-0">
        <User size={16} className="text-telegram-button" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-telegram-text truncate">{user.display_name}</div>
        <div className="text-xs text-telegram-hint">
          Lv.{user.level} · {user.xp.toLocaleString()} XP
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xs text-telegram-hint">
          {new Date(user.last_active).toLocaleDateString()}
        </div>
        <div className="flex gap-1 mt-0.5 justify-end">
          {user.active_modes.slice(0, 2).map((mode) => (
            <span key={mode} className="px-1.5 py-0.5 bg-telegram-button/10 text-telegram-button text-[10px] rounded">
              {mode}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
}
