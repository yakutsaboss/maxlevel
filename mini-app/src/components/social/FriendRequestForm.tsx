import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface FriendRequestFormProps {
  userId: number;
  onSuccess: () => void;
  haptic: { notification: (type: 'error' | 'success' | 'warning') => void };
}

export function FriendRequestForm({ userId, onSuccess, haptic }: FriendRequestFormProps) {
  const [telegramId, setTelegramId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
  };

  const handleSubmit = async () => {
    if (!telegramId.trim()) return;
    const toUserId = parseInt(telegramId.trim());
    if (isNaN(toUserId) || toUserId <= 0) {
      setError('Please enter a valid Telegram ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await fetch(`${API_BASE_URL}/social/friends/request`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fromUserId: userId, toUserId }),
      });

      const data = await res.json();
      if (data.success) {
        haptic.notification('success');
        setSuccess('Friend request sent!');
        setTelegramId('');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(data.message || 'Failed to send request');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 mb-3">
      <label className="block text-sm font-medium text-telegram-text mb-2">
        Friend's Telegram ID
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          value={telegramId}
          onChange={(e) => setTelegramId(e.target.value)}
          placeholder="Enter Telegram ID"
          className="flex-1 bg-telegram-bg border border-telegram-hint/20 rounded-xl px-3 py-2 text-telegram-text text-sm placeholder:text-telegram-hint/50 focus:outline-none focus:border-telegram-link"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !telegramId.trim()}
          className="flex items-center gap-1 bg-telegram-link text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send
        </button>
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}
      {success && (
        <p className="text-green-400 text-xs mt-2">{success}</p>
      )}
    </div>
  );
}
