import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, AlertTriangle } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { API_BASE_URL } from '@/api/adminClient';

interface AdminBroadcastProps {
  credentials: string;
}

export function AdminBroadcast({ credentials }: AdminBroadcastProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;

    const confirmed = window.confirm(
      `${t('admin.broadcastConfirm')}\n\n"${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"`
    );
    if (!confirmed) return;

    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/broadcast`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      });

      if (res.status === 501) {
        setToast({ message: t('admin.broadcastNotEnabled'), variant: 'info' });
      } else if (res.ok) {
        const data = await res.json();
        const sent = data.data?.sent ?? data.sent ?? 0;
        const failed = data.data?.failed ?? data.failed ?? 0;
        setToast({
          message: t('admin.broadcastSent', { sent, failed }),
          variant: failed > 0 ? 'info' : 'success',
        });
        setMessage('');
      } else {
        setToast({ message: t('admin.serverErrorStatus', { status: res.status }), variant: 'error' });
      }
    } catch {
      setToast({ message: t('admin.connectionFailed'), variant: 'error' });
    } finally {
      setSending(false);
    }
  }, [message, credentials]);

  return (
    <div className="space-y-4">
      <div className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">{t('admin.sendBroadcast')}</h3>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('admin.messagePlaceholder')}
          rows={5}
          maxLength={4096}
          className="w-full px-4 py-3 bg-telegram-bg rounded-xl text-telegram-text placeholder-telegram-hint border border-telegram-hint/20 focus:border-telegram-button focus:outline-none transition-colors resize-none text-sm"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-telegram-hint">
            {message.length}/4096
          </span>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="px-5 py-2.5 bg-telegram-button text-telegram-buttonText rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-opacity"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-telegram-buttonText/30 border-t-telegram-buttonText rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {sending ? t('admin.sending') : t('admin.sendBroadcastButton')}
          </button>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
        <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-telegram-text space-y-1">
          <div className="font-medium">{t('admin.headsUp')}</div>
          <div className="text-telegram-hint">
            {t('admin.broadcastWarning')}
          </div>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
