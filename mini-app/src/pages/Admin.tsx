import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, LogOut, Users, BarChart3, Megaphone, Briefcase, ScrollText } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminUserList } from '@/components/AdminUserList';
import { AdminBroadcast } from '@/components/AdminBroadcast';
import { AdminJobs } from '@/components/AdminJobs';
import { AdminLogs } from '@/components/AdminLogs';
import { adminFetch } from '@/api/adminClient';

type AdminTab = 'stats' | 'users' | 'broadcast' | 'jobs' | 'logs';

interface AdminStats {
  total_users: number;
  active_users_7d: number;
  total_quests_completed: number;
  total_achievements_unlocked: number;
}

const tabs: { id: AdminTab; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'stats', labelKey: 'admin.overview', icon: <BarChart3 size={18} aria-hidden="true" /> },
  { id: 'users', labelKey: 'admin.users', icon: <Users size={18} aria-hidden="true" /> },
  { id: 'broadcast', labelKey: 'admin.broadcast', icon: <Megaphone size={18} aria-hidden="true" /> },
  { id: 'jobs', labelKey: 'admin.jobs', icon: <Briefcase size={18} aria-hidden="true" /> },
  { id: 'logs', labelKey: 'admin.logs', icon: <ScrollText size={18} aria-hidden="true" /> },
];

export function Admin() {
  const { t } = useTranslation();
  const [authenticated, setAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const loadStats = useCallback(async (creds: string) => {
    try {
      const res = await adminFetch('/stats', creds);
      if (res.ok) {
        const data = await res.json();
        setStats(data.data || data);
      }
    } catch {
      // Stats load failure is non-critical
    }
  }, []);

  // Check for saved credentials on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_credentials');
    if (saved) {
      setCredentials(saved);
      setAuthenticated(true);
      loadStats(saved);
    }
  }, []);

  const handleLoginSuccess = useCallback((creds: string, loginStats: AdminStats) => {
    setCredentials(creds);
    setStats(loginStats);
    setAuthenticated(true);
    sessionStorage.setItem('admin_credentials', creds);
    setToast({ message: t('admin.loggedIn'), variant: 'success' });
  }, []);

  const handleLogout = useCallback(() => {
    setAuthenticated(false);
    setCredentials('');
    setStats(null);
    sessionStorage.removeItem('admin_credentials');
  }, []);

  if (!authenticated) {
    return <AdminLoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text">
      {/* Header */}
      <div className="bg-telegram-secondaryBg px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-telegram-button" aria-hidden="true" />
            <h1 className="text-lg font-bold">{t('admin.dashboard.title')}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-telegram-hint hover:text-red-400 transition-colors"
            aria-label="Log out"
          >
            <LogOut size={16} aria-hidden="true" />
            {t('admin.logout')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-telegram-bg rounded-xl p-1 overflow-x-auto hide-scrollbar" role="tablist" aria-label="Admin tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-telegram-button text-telegram-buttonText'
                  : 'text-telegram-hint hover:text-telegram-text'
              }`}
            >
              {tab.icon}
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'stats' && (
          <AdminOverview stats={stats} credentials={credentials} onRefresh={loadStats} />
        )}
        {activeTab === 'users' && <AdminUserList credentials={credentials} />}
        {activeTab === 'broadcast' && <AdminBroadcast credentials={credentials} />}
        {activeTab === 'jobs' && <AdminJobs credentials={credentials} />}
        {activeTab === 'logs' && <AdminLogs credentials={credentials} />}
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
