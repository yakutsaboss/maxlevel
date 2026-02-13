import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { Toast } from '@/components/Toast';
import { adminFetch } from '@/api/adminClient';

interface AdminStats {
  total_users: number;
  active_users_7d: number;
  total_quests_completed: number;
  total_achievements_unlocked: number;
}

interface AdminLoginFormProps {
  onLoginSuccess: (credentials: string, stats: AdminStats) => void;
}

export function AdminLoginForm({ onLoginSuccess }: AdminLoginFormProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password.trim()) return;

    setLoginLoading(true);
    const creds = btoa(`${username}:${password}`);

    try {
      const res = await adminFetch('/stats', creds);
      if (res.status === 401) {
        setToast({ message: t('admin.invalidCredentials'), variant: 'error' });
      } else if (res.ok) {
        const data = await res.json();
        onLoginSuccess(creds, data.data || data);
      } else {
        setToast({ message: t('admin.serverErrorStatus', { status: res.status }), variant: 'error' });
      }
    } catch {
      setToast({ message: t('admin.connectionFailed'), variant: 'error' });
    } finally {
      setLoginLoading(false);
    }
  }, [username, password, onLoginSuccess]);

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
            <h1 className="text-xl font-bold text-telegram-text">{t('admin.panel')}</h1>
            <p className="text-sm text-telegram-hint">{t('admin.enterCredentials')}</p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder={t('admin.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 bg-telegram-bg rounded-xl text-telegram-text placeholder-telegram-hint border border-telegram-hint/20 focus:border-telegram-button focus:outline-none transition-colors"
              autoComplete="username"
            />
            <input
              type="password"
              placeholder={t('admin.password')}
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
                {t('admin.login')}
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
