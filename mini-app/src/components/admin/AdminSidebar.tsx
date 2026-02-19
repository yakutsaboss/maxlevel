import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Target,
  Award,
  BookOpen,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', path: '/admin/dashboard', icon: LayoutDashboard, labelKey: 'admin.sidebar.dashboard' },
  { id: 'players', path: '/admin/players', icon: Users, labelKey: 'admin.sidebar.players' },
  { id: 'quests', path: '/admin/quests', icon: Target, labelKey: 'admin.sidebar.quests' },
  { id: 'achievements', path: '/admin/achievements', icon: Award, labelKey: 'admin.sidebar.achievements' },
  { id: 'content', path: '/admin/content', icon: BookOpen, labelKey: 'admin.sidebar.content' },
  { id: 'analytics', path: '/admin/analytics', icon: BarChart3, labelKey: 'admin.sidebar.analytics' },
  { id: 'settings', path: '/admin/settings', icon: Settings, labelKey: 'admin.sidebar.settings' },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const isActive = (path: string) => {
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin/dashboard' || location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const sidebarContent = (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.path)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-left ${
              active
                ? 'bg-telegram-button text-telegram-buttonText'
                : 'text-telegram-hint hover:text-telegram-text hover:bg-telegram-secondaryBg'
            }`}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{t(item.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-telegram-secondaryBg border-r border-telegram-hint/10 min-h-screen">
        <div className="px-4 py-5">
          <h2 className="text-xs font-semibold text-telegram-hint uppercase tracking-wider">
            {t('admin.sidebar.navigation', 'Navigation')}
          </h2>
        </div>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-telegram-bg z-50 md:hidden shadow-xl"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-telegram-hint/10">
                <h2 className="text-sm font-semibold text-telegram-text">
                  {t('admin.sidebar.navigation', 'Navigation')}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 text-telegram-hint hover:text-telegram-text transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
