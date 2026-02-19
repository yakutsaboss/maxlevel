import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Menu, LogOut, Bell } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { AdminLoginForm } from './AdminLoginForm';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [credentials, setCredentials] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_credentials');
    if (saved) {
      setCredentials(saved);
    }
    setCheckingAuth(false);
  }, []);

  const handleLoginSuccess = useCallback((creds: string) => {
    setCredentials(creds);
    sessionStorage.setItem('admin_credentials', creds);
  }, []);

  const handleLogout = useCallback(() => {
    setCredentials(null);
    sessionStorage.removeItem('admin_credentials');
    navigate('/admin');
  }, [navigate]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-telegram-button/30 border-t-telegram-button rounded-full animate-spin" />
      </div>
    );
  }

  if (!credentials) {
    return (
      <AdminLoginForm
        onLoginSuccess={(creds) => handleLoginSuccess(creds)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text flex">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-telegram-secondaryBg px-4 py-3 flex items-center justify-between border-b border-telegram-hint/10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1 text-telegram-hint hover:text-telegram-text transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-telegram-button" aria-hidden="true" />
              <h1 className="text-base font-bold truncate">
                {title || t('admin.panel', 'Admin Panel')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell placeholder — Agent G will provide AdminNotifications */}
            <button
              className="p-2 text-telegram-hint hover:text-telegram-text transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={20} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-telegram-hint hover:text-red-400 transition-colors px-2 py-1"
              aria-label="Log out"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="hidden sm:inline">{t('admin.logout', 'Logout')}</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function useAdminCredentials(): string {
  const creds = sessionStorage.getItem('admin_credentials');
  return creds || '';
}
