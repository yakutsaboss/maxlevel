import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sticker, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const STORAGE_KEY = 'celebration-sticker-pack';

interface StickerPack {
  name: string;
  title: string;
  sticker_count: number;
  thumbnail_url?: string;
}

function getAuthHeaders(): Record<string, string> {
  const initData = window.Telegram?.WebApp?.initData;
  return initData
    ? { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData }
    : { 'Content-Type': 'application/json' };
}

function getSelectedPack(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setSelectedPack(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch { /* noop */ }
}

export function StickerPackBrowser() {
  const { t } = useTranslation();
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(getSelectedPack);

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE_URL}/stickers/sets`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      if (!json.success) throw new Error('api error');
      setPacks(json.data ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  const handleSelect = (name: string) => {
    setSelected(name);
    setSelectedPack(name);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-amber-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
          <Sticker className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{t('settings.stickerPacks')}</h3>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-telegram-bg animate-pulse"
              role="status"
              aria-label="Loading"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex items-center gap-2 text-sm text-telegram-hint py-3">
          <AlertCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
          <span>{t('settings.stickerPacksError')}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && packs.length === 0 && (
        <p className="text-sm text-telegram-hint py-3">
          {t('settings.stickerPacksEmpty')}
        </p>
      )}

      {/* Pack list */}
      {!loading && !error && packs.length > 0 && (
        <div className="space-y-2">
          {packs.map((pack) => {
            const isSelected = selected === pack.name;
            return (
              <button
                key={pack.name}
                onClick={() => handleSelect(pack.name)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'bg-emerald-500/15 ring-2 ring-emerald-500'
                    : 'bg-telegram-bg border border-telegram-hint/20'
                }`}
              >
                {/* Thumbnail or fallback */}
                <div className="w-10 h-10 rounded-lg bg-telegram-hint/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {pack.thumbnail_url ? (
                    <img
                      src={pack.thumbnail_url}
                      alt={pack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Sticker className="w-5 h-5 text-telegram-hint" aria-hidden="true" />
                  )}
                </div>

                {/* Pack info */}
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium truncate">{pack.title}</div>
                  <div className="text-[11px] text-telegram-hint">
                    {pack.sticker_count} stickers
                  </div>
                </div>

                {/* Check mark */}
                {isSelected && (
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
