import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Target, User, Trophy, Settings, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback } from 'react';
import { useTelegram } from '@/hooks/useTelegram';

interface NavItem {
  path: string;
  Icon: LucideIcon;
  labelKey: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', Icon: Home, labelKey: 'nav.home' },
  { path: '/quests', Icon: Target, labelKey: 'nav.quests' },
  { path: '/leaderboard', Icon: Trophy, labelKey: 'nav.ranks' },
  { path: '/profile', Icon: User, labelKey: 'nav.profile' },
  { path: '/settings', Icon: Settings, labelKey: 'nav.settings' },
];

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 30 };

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
          const isSettings = item.path === '/settings';
          const isQuests = item.path === '/quests';

          return (
            <motion.button
              key={item.path}
              data-nav-index={index}
              onClick={() => handleNavigate(item.path)}
              onKeyDown={(e) => handleNavKeyDown(e, index)}
              aria-label={isQuests && questBadgeCount > 0 ? `${label} (${questBadgeCount} new)` : label}
              aria-current={isActive ? 'page' : undefined}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className="relative flex flex-col items-center justify-center py-2 px-3 transition-colors"
              whileTap={{ scale: 0.9, y: -1 }}
              transition={springTransition}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-telegram-link/10 rounded-2xl"
                  transition={springTransition}
                />
              )}
              <div className={`relative z-10 transition-colors ${isActive ? 'text-telegram-link' : 'text-telegram-hint'}`} aria-hidden="true">
                {/* Icon with scale + optional rotation for Settings */}
                <motion.div
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    ...(isSettings ? { rotate: isActive ? 90 : 0 } : {}),
                  }}
                  transition={springTransition}
                >
                  <item.Icon className="w-5 h-5" />
                </motion.div>
                {/* Quest badge with pop-in animation */}
                {isQuests && (
                  <AnimatePresence>
                    {questBadgeCount > 0 && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 leading-none shadow-sm"
                      >
                        {questBadgeCount > 9 ? '9+' : questBadgeCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
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
                  transition={springTransition}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
