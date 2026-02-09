import { useState, useCallback, useEffect } from 'react';
import { Shield, LogIn, LogOut, Users, BarChart3, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { Toast } from '@/components/Toast';
import { AdminStatsCard } from '@/components/AdminStatsCard';
import { AdminUserList } from '@/components/AdminUserList';
import { AdminBroadcast } from '@/components/AdminBroadcast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type AdminTab = 'stats' | 'users' | 'broadcast';

interface AdminStats {
  total_users: number;
  active_users_7d: number;
  total_quests_completed: number;
  total_achievements_unlocked: number;
}

async function adminFetch(path: string, credentials: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE_URL}/admin${path}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return res;
}

export function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [credentials, setCredentials] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  // Check for saved credentials on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_credentials');
    if (saved) {
      setCredentials(saved);
      setAuthenticated(true);
      loadStats(saved);
    }
  }, []);

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

  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password.trim()) return;

    setLoginLoading(true);
    const creds = btoa(`${username}:${password}`);

    try {
      const res = await adminFetch('/stats', creds);
      if (res.status === 401) {
        setToast({ message: 'Invalid credentials', variant: 'error' });
      } else if (res.ok) {
        const data = await res.json();
        setStats(data.data || data);
        setCredentials(creds);
        setAuthenticated(true);
        sessionStorage.setItem('admin_credentials', creds);
        setToast({ message: 'Logged in successfully', variant: 'success' });
      } else {
        setToast({ message: `Server error: ${res.status}`, variant: 'error' });
      }
    } catch {
      setToast({ message: 'Connection failed', variant: 'error' });
    } finally {
      setLoginLoading(false);
    }
  }, [username, password]);

  const handleLogout = useCallback(() => {
    setAuthenticated(false);
    setCredentials('');
    setStats(null);
    setUsername('');
    setPassword('');
    sessionStorage.removeItem('admin_credentials');
  }, []);

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'stats', label: 'Overview', icon: <BarChart3 size={18} /> },
    { id: 'users', label: 'Users', icon: <Users size={18} /> },
    { id: 'broadcast', label: 'Broadcast', icon: <Megaphone size={18} /> },
  ];

  // Login form
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="bg-telegram-secondaryBg rounded-2xl p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-telegram-button/10 rounded-full flex items-center justify-center mx-auto">
                <Shield size={28} className="text-telegram-button" />
              </div>
              <h1 className="text-xl font-bold text-telegram-text">Admin Panel</h1>
              <p className="text-sm text-telegram-hint">Enter your admin credentials</p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 bg-telegram-bg rounded-xl text-telegram-text placeholder-telegram-hint border border-telegram-hint/20 focus:border-telegram-button focus:outline-none transition-colors"
                autoComplete="username"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 bg-telegram-bg rounded-xl text-telegram-text placeholder-telegram-hint border border-telegram-hint/20 focus:border-telegram-button focus:outline-none transition-colors"
                autoComplete="current-password"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loginLoading || !username.trim() || !password.trim()}
              className="w-full py-3 bg-telegram-button text-telegram-buttonText rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {loginLoading ? (
                <div className="w-5 h-5 border-2 border-telegram-buttonText/30 border-t-telegram-buttonText rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Login
                </>
              )}
            </button>
          </div>
        </motion.div>

        {toast && (
          <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
        )}
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text">
      {/* Header */}
      <div className="bg-telegram-secondaryBg px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-telegram-button" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-telegram-hint hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-telegram-bg rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-telegram-button text-telegram-buttonText'
                  : 'text-telegram-hint hover:text-telegram-text'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'stats' && (
          <AdminStatsCard stats={stats} credentials={credentials} onRefresh={loadStats} />
        )}
        {activeTab === 'users' && (
          <AdminUserList credentials={credentials} />
        )}
        {activeTab === 'broadcast' && (
          <AdminBroadcast credentials={credentials} />
        )}
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
