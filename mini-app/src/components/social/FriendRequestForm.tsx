import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Send, Loader2, UserPlus } from 'lucide-react';
import { searchUsers, type SearchUser } from '@/api/social';

interface FriendRequestFormProps {
  userId: number;
  onSuccess: () => void;
  haptic: { notification: (type: 'error' | 'success' | 'warning') => void };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function FriendRequestForm({ userId, onSuccess, haptic }: FriendRequestFormProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
  };

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      setSearching(true);
      setError('');
      const data = await searchUsers(q);
      // Filter out self
      setResults((data || []).filter((u) => u.id !== userId));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [userId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const handleSendRequest = async (toUserId: number) => {
    try {
      setSendingTo(toUserId);
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
        setSuccess(t('social.sendRequest') + '!');
        setQuery('');
        setResults([]);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(data.message || 'Failed to send request');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 mb-3">
      <label className="block text-sm font-medium text-telegram-text mb-2">
        {t('social.searchFriends')}
      </label>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-telegram-hint/50" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('social.searchPlaceholder')}
          className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl pl-9 pr-3 py-2 text-telegram-text text-sm placeholder:text-telegram-hint/50 focus:outline-none focus:border-telegram-link"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-telegram-hint animate-spin" />
        )}
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 bg-telegram-bg rounded-xl p-3 border border-telegram-hint/10"
            >
              <div className="w-9 h-9 rounded-full bg-telegram-link/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-telegram-link">
                  {user.first_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-telegram-text text-sm truncate">
                  {user.first_name}
                  {user.username && (
                    <span className="text-telegram-hint text-xs ml-1">@{user.username}</span>
                  )}
                </div>
                <div className="text-xs text-telegram-hint">
                  Lv.{user.current_level} &middot; {user.total_xp.toLocaleString()} XP
                </div>
              </div>
              <button
                onClick={() => handleSendRequest(user.id)}
                disabled={sendingTo !== null}
                className="flex items-center gap-1 bg-telegram-link text-white px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50 active:scale-95 transition-transform flex-shrink-0"
              >
                {sendingTo === user.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                <Send className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No results state */}
      {query.length >= 2 && !searching && results.length === 0 && (
        <p className="text-telegram-hint text-xs text-center py-3">{t('social.noUsersFound')}</p>
      )}

      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}
      {success && (
        <p className="text-green-400 text-xs mt-2">{success}</p>
      )}
    </div>
  );
}
