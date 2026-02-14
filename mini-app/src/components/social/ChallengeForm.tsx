import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const KNOWN_MODES = ['fitness', 'hydration', 'finance', 'learning', 'medication', 'habits'] as const;

interface ChallengeFormProps {
  userId: number;
  onSuccess: () => Promise<void>;
  haptic: { notification: (type: 'error' | 'success' | 'warning') => void };
}

export function ChallengeForm({ userId, onSuccess, haptic }: ChallengeFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await fetch(`${API_BASE_URL}/social/challenges/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          creatorId: userId,
          title: title.trim(),
          description: description.trim() || null,
          mode: mode || null,
          targetValue: targetValue ? parseInt(targetValue, 10) : null,
          endDate: endDate || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        haptic.notification('success');
        setSuccess(t('social.challengeCreated') || 'Challenge created!');
        setTitle('');
        setDescription('');
        setMode(null);
        setTargetValue('');
        setEndDate('');
        await onSuccess();
        setTimeout(() => {
          setSuccess('');
        }, 1500);
      } else {
        setError(data.message || 'Failed to create challenge');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (m: string) => {
    setMode(mode === m ? null : m);
  };

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 mb-3">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-telegram-text mb-1">
            {t('admin.title')} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('social.challengeTitlePlaceholder') || 'Challenge title'}
            maxLength={200}
            className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-3 py-2 text-telegram-text text-sm placeholder:text-telegram-hint/50 focus:outline-none focus:border-telegram-link"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-telegram-text mb-1">
            {t('admin.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('social.challengeDescPlaceholder') || 'Optional description'}
            maxLength={2000}
            rows={2}
            className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-3 py-2 text-telegram-text text-sm placeholder:text-telegram-hint/50 focus:outline-none focus:border-telegram-link resize-none"
          />
        </div>

        {/* Mode pills */}
        <div>
          <label className="block text-sm font-medium text-telegram-text mb-2">
            {t('social.challengeMode')}
          </label>
          <div className="flex flex-wrap gap-2">
            {KNOWN_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMode(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  mode === m
                    ? 'bg-telegram-link text-white'
                    : 'bg-telegram-bg text-telegram-hint border border-telegram-hint/20'
                }`}
              >
                {t(`social.mode_${m}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Target value */}
        <div>
          <label className="block text-sm font-medium text-telegram-text mb-1">
            {t('social.targetValue')}
          </label>
          <input
            type="number"
            min="1"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={t('social.targetValuePlaceholder') || 'e.g. 100'}
            className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-3 py-2 text-telegram-text text-sm placeholder:text-telegram-hint/50 focus:outline-none focus:border-telegram-link"
          />
        </div>

        {/* End date */}
        <div>
          <label className="block text-sm font-medium text-telegram-text mb-1">
            {t('social.endDate')}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-3 py-2 text-telegram-text text-sm placeholder:text-telegram-hint/50 focus:outline-none focus:border-telegram-link"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim()}
          className="w-full flex items-center justify-center gap-2 bg-telegram-link text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PlusCircle className="w-4 h-4" />
          )}
          {t('common.create')} {t('social.challenge')}
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
