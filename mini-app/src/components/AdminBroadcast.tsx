import { useState, useCallback } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { API_BASE_URL } from '@/api/adminClient';

interface AdminBroadcastProps {
  credentials: string;
}

export function AdminBroadcast({ credentials }: AdminBroadcastProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;

    const confirmed = window.confirm(
      `Send this message to ALL active users?\n\n"${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"`
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
        setToast({ message: 'Broadcast not yet enabled on server', variant: 'info' });
      } else if (res.ok) {
        const data = await res.json();
        const sent = data.data?.sent ?? data.sent ?? 0;
        const failed = data.data?.failed ?? data.failed ?? 0;
        setToast({
          message: `Broadcast sent: ${sent} delivered, ${failed} failed`,
          variant: failed > 0 ? 'info' : 'success',
        });
        setMessage('');
      } else {
        setToast({ message: `Server error: ${res.status}`, variant: 'error' });
      }
    } catch {
      setToast({ message: 'Connection failed', variant: 'error' });
    } finally {
      setSending(false);
    }
  }, [message, credentials]);

  return (
    <div className="space-y-4">
      <div className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">Send Broadcast</h3>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
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
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
        <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-telegram-text space-y-1">
          <div className="font-medium">Heads up</div>
          <div className="text-telegram-hint">
            This will send the message to all active users. Messages are sent in batches to respect Telegram rate limits. Make sure the message is correct before sending.
          </div>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
