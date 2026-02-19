import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Target, User, Trophy, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCallback } from 'react';
import { useTelegram } from '@/hooks/useTelegram';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  labelKey: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', icon: <Home className="w-5 h-5" />, labelKey: 'nav.home' },
  { path: '/quests', icon: <Target className="w-5 h-5" />, labelKey: 'nav.quests' },
  { path: '/leaderboard', icon: <Trophy className="w-5 h-5" />, labelKey: 'nav.ranks' },
  { path: '/profile', icon: <User className="w-5 h-5" />, labelKey: 'nav.profile' },
  { path: '/settings', icon: <Settings className="w-5 h-5" />, labelKey: 'nav.settings' },
];

interface NavigationProps {
  questBadgeCount?: number;
}

export function Navigation({ questBadgeCount = 0 }: NavigationProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const handleNavigate = (path: string) => {
    haptic.selection();
    navigate(path);
  };

  const handleNavKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (index + 1) % navItems.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (index - 1 + navItems.length) % navItems.length;
    }

    if (nextIndex >= 0) {
      const nav = e.currentTarget.closest('nav');
      const buttons = nav?.querySelectorAll<HTMLElement>('[data-nav-index]');
      buttons?.[nextIndex]?.focus();
    }
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-telegram-secondaryBg border-t border-telegram-hint/20 safe-area-bottom z-40"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-2 py-2" role="tablist">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const label = t(item.labelKey);

          return (
            <button
              key={item.path}
              data-nav-index={index}
              onClick={() => handleNavigate(item.path)}
              onKeyDown={(e) => handleNavKeyDown(e, index)}
              aria-label={item.path === '/quests' && questBadgeCount > 0 ? `${label} (${questBadgeCount} new)` : label}
              aria-current={isActive ? 'page' : undefined}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className="relative flex flex-col items-center justify-center py-2 px-3 transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-telegram-link/10 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative z-10 transition-colors ${isActive ? 'text-telegram-link' : 'text-telegram-hint'}`} aria-hidden="true">
                {item.icon}
                {item.path === '/quests' && questBadgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 leading-none shadow-sm">
                    {questBadgeCount > 9 ? '9+' : questBadgeCount}
                  </span>
                )}
              </div>
              <span className={`relative z-10 text-xs mt-1 transition-colors ${isActive ? 'text-telegram-link font-semibold' : 'text-telegram-hint'}`}>
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="absolute -bottom-0.5 w-5 h-0.5 bg-telegram-link rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
