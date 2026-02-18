import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Target, User, Trophy, Award, Users, DollarSign, Medal, MoreHorizontal, ShoppingBag, BarChart3, Dumbbell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTelegram } from '@/hooks/useTelegram';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  labelKey: string;
}

const primaryItems: NavItem[] = [
  { path: '/dashboard', icon: <Home className="w-5 h-5" />, labelKey: 'nav.home' },
  { path: '/quests', icon: <Target className="w-5 h-5" />, labelKey: 'nav.quests' },
  { path: '/activity', icon: <Dumbbell className="w-5 h-5" />, labelKey: 'nav.activities' },
  { path: '/shop', icon: <ShoppingBag className="w-5 h-5" />, labelKey: 'nav.shop' },
  { path: '/achievements', icon: <Award className="w-5 h-5" />, labelKey: 'nav.rewards' },
];

const moreItems: NavItem[] = [
  { path: '/profile', icon: <User className="w-5 h-5" />, labelKey: 'nav.profile' },
  { path: '/leaderboard', icon: <Trophy className="w-5 h-5" />, labelKey: 'nav.ranks' },
  { path: '/trophies', icon: <Medal className="w-5 h-5" />, labelKey: 'nav.trophies' },
  { path: '/analytics', icon: <BarChart3 className="w-5 h-5" />, labelKey: 'nav.analytics' },
  { path: '/social', icon: <Users className="w-5 h-5" />, labelKey: 'nav.social' },
  { path: '/finance', icon: <DollarSign className="w-5 h-5" />, labelKey: 'nav.finance' },
];

interface NavigationProps {
  questBadgeCount?: number;
}

export function Navigation({ questBadgeCount = 0 }: NavigationProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isMoreActive = moreItems.some((item) => location.pathname === item.path);

  // Close popup on outside tap
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [moreOpen]);

  // Close popup on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const handleNavigate = (path: string) => {
    haptic.selection();
    navigate(path);
  };

  // All nav items: 5 primary + "More" button (index 5)
  const allNavCount = primaryItems.length + 1;

  // Keyboard handler for primary nav: Arrow Left/Right to move, Enter/Space to activate
  const handleNavKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (index + 1) % allNavCount;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (index - 1 + allNavCount) % allNavCount;
    }

    if (nextIndex >= 0) {
      const nav = e.currentTarget.closest('nav');
      const buttons = nav?.querySelectorAll<HTMLElement>('[data-nav-index]');
      buttons?.[nextIndex]?.focus();
    }
  }, [allNavCount]);

  // Keyboard handler for "More" popup items
  const handleMoreKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setMoreOpen(false);
      // Return focus to the More button
      const nav = e.currentTarget.closest('nav');
      const moreBtn = nav?.querySelector<HTMLElement>('[data-nav-index="5"]');
      moreBtn?.focus();
      return;
    }

    let nextIndex = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (index + 1) % moreItems.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (index - 1 + moreItems.length) % moreItems.length;
    }

    if (nextIndex >= 0) {
      const popup = e.currentTarget.closest('[role="menu"]');
      const items = popup?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      items?.[nextIndex]?.focus();
    }
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-telegram-secondaryBg border-t border-telegram-hint/20 safe-area-bottom z-40"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-2 py-2" role="tablist">
        {primaryItems.map((item, index) => {
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

        {/* More button */}
        <div ref={moreRef} className="relative">
          <button
            data-nav-index={5}
            onClick={() => {
              haptic.selection();
              setMoreOpen((prev) => !prev);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && moreOpen) {
                e.preventDefault();
                setMoreOpen(false);
                return;
              }
              handleNavKeyDown(e, 5);
            }}
            aria-label={t('nav.more')}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            className="relative flex flex-col items-center justify-center py-2 px-3 transition-colors"
          >
            {isMoreActive && !moreOpen && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-telegram-link/10 rounded-2xl"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <div className={`relative z-10 transition-colors ${isMoreActive || moreOpen ? 'text-telegram-link' : 'text-telegram-hint'}`} aria-hidden="true">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className={`relative z-10 text-xs mt-1 transition-colors ${isMoreActive || moreOpen ? 'text-telegram-link font-semibold' : 'text-telegram-hint'}`}>
              {t('nav.more')}
            </span>
            {isMoreActive && !moreOpen && (
              <motion.div
                layoutId="activeIndicator"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                className="absolute -bottom-0.5 w-5 h-0.5 bg-telegram-link rounded-full"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>

          {/* Popup menu */}
          <AnimatePresence>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full right-0 mb-2 bg-telegram-secondaryBg border border-telegram-hint/20 rounded-2xl shadow-lg overflow-hidden min-w-[160px] z-50"
                role="menu"
              >
                {moreItems.map((item, index) => {
                  const isActive = location.pathname === item.path;
                  const label = t(item.labelKey);

                  return (
                    <button
                      key={item.path}
                      role="menuitem"
                      tabIndex={0}
                      onClick={() => handleNavigate(item.path)}
                      onKeyDown={(e) => handleMoreKeyDown(e, index)}
                      className={`flex items-center gap-3 w-full px-4 py-3 transition-colors ${
                        isActive
                          ? 'text-telegram-link bg-telegram-link/10'
                          : 'text-telegram-text active:bg-telegram-hint/10'
                      }`}
                    >
                      <div className={isActive ? 'text-telegram-link' : 'text-telegram-hint'}>
                        {item.icon}
                      </div>
                      <span className={`text-sm ${isActive ? 'font-semibold' : ''}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
