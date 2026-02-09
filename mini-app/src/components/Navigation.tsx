import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Target, User, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', icon: <Home className="w-5 h-5" />, label: 'Home' },
  { path: '/quests', icon: <Target className="w-5 h-5" />, label: 'Quests' },
  { path: '/leaderboard', icon: <Trophy className="w-5 h-5" />, label: 'Ranks' },
  { path: '/profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const handleNavigate = (path: string) => {
    haptic.selection();
    navigate(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-telegram-secondaryBg border-t border-telegram-hint/20 safe-area-bottom z-40"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center py-2 px-3 transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-telegram-link/10 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative z-10 transition-colors ${isActive ? 'text-telegram-link' : 'text-telegram-hint'}`}>
                {item.icon}
              </div>
              <span className={`relative z-10 text-xs mt-1 transition-colors ${isActive ? 'text-telegram-link font-semibold' : 'text-telegram-hint'}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 w-1 h-1 bg-telegram-link rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
