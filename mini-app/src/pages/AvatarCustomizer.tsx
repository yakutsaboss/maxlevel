import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram, useBackButton } from '@/hooks/useTelegram.js';
import { useAvatar } from '@/hooks/useAvatar.js';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh.js';
import { ErrorSection } from '@/components/ErrorSection.js';
import { Lock, Check, Loader2, User } from 'lucide-react';
import { motion } from 'framer-motion';
import type { EquippedItems } from '@/api/avatars.js';

const CATEGORIES = ['hairstyle', 'outfit', 'accessory', 'background'] as const;
type Category = typeof CATEGORIES[number];

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-gray-400',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-amber-500',
};

// Placeholder avatar preview — will be replaced by AvatarRenderer from
// @/components/avatar after Agent B's branch merges (merge order: B before C).
function AvatarPreview({ equipped }: { equipped: EquippedItems }) {
  const slots = Object.entries(equipped).filter(([, v]) => v);
  return (
    <div className="relative w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center shadow-xl" role="img" aria-label={`Avatar preview with ${slots.length} items equipped`}>
      {slots.length === 0 ? (
        <User className="w-16 h-16 text-white/60" aria-hidden="true" />
      ) : (
        <div className="text-center text-white">
          <User className="w-12 h-12 mx-auto mb-1 text-white/80" aria-hidden="true" />
          <span className="text-xs text-white/60">{slots.length} items</span>
        </div>
      )}
    </div>
  );
}

// Loading skeleton
function AvatarCustomizerSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg animate-pulse" role="status" aria-label="Loading avatar customizer">
      <div className="pt-12 pb-8 px-6 flex flex-col items-center">
        <div className="w-40 h-40 rounded-full bg-telegram-secondaryBg" />
        <div className="mt-4 w-32 h-6 rounded bg-telegram-secondaryBg" />
      </div>
      <div className="px-4 flex gap-2 mb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-10 rounded-xl bg-telegram-secondaryBg" />
        ))}
      </div>
      <div className="px-4 grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-28 rounded-xl bg-telegram-secondaryBg" />
        ))}
      </div>
    </div>
  );
}

export function AvatarCustomizer() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('hairstyle');

  const {
    items,
    equipped,
    preview,
    loading,
    saving,
    error,
    previewItem,
    equipItem,
    resetPreview,
    isItemUnlocked,
    refresh,
  } = useAvatar(user?.id);

  // Back button navigates to profile
  useBackButton(useCallback(() => {
    resetPreview();
    navigate('/profile');
  }, [resetPreview, navigate]));

  // Pull to refresh
  const handleRefresh = useCallback(async () => { await refresh(); }, [refresh]);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } =
    usePullToRefresh(handleRefresh, haptic);

  // Filter items by active category
  const categoryItems = useMemo(
    () => items
      .filter(item => item.category === activeCategory)
      .sort((a, b) => a.sort_order - b.sort_order),
    [items, activeCategory],
  );

  // Check if preview differs from equipped (has unsaved changes)
  const hasChanges = useMemo(() => {
    return CATEGORIES.some(cat => preview[cat] !== equipped[cat]);
  }, [preview, equipped]);

  // Save all changed categories
  const handleSave = useCallback(async () => {
    haptic.impact('medium');
    for (const cat of CATEGORIES) {
      if (preview[cat] !== equipped[cat]) {
        const item = items.find(i => i.category === cat && i.sprite_key === preview[cat]);
        await equipItem(cat, item?.id ?? null);
      }
    }
    haptic.notification('success');
  }, [preview, equipped, items, equipItem, haptic]);

  // Determine user level + achievements for unlock checks
  // These will be available from the user context once fully integrated
  const userLevel = 1;
  const userAchievements: string[] = [];

  if (loading) return <AvatarCustomizerSkeleton />;
  if (error) return <ErrorSection message={error} onRetry={refresh} />;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-24 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Avatar preview section */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 pt-10 pb-8 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <h1 className="text-xl font-bold text-white text-center mb-4">
          {t('avatar.title')}
        </h1>
        <AvatarPreview equipped={preview} />
        <p className="text-center text-white/60 text-sm mt-3">{t('avatar.preview')}</p>
      </div>

      {/* Category tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-2" role="tablist" aria-label="Avatar categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              onClick={() => {
                haptic.impact('light');
                setActiveCategory(cat);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-telegram-link text-white shadow-md'
                  : 'bg-telegram-secondaryBg text-telegram-hint'
              }`}
            >
              {t(`avatar.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Item grid */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-3 mb-4">
        {categoryItems.map(item => {
          const unlocked = isItemUnlocked(item, userLevel, userAchievements);
          const isEquipped = equipped[activeCategory] === item.sprite_key;
          const isPreviewed = preview[activeCategory] === item.sprite_key;

          return (
            <motion.button
              key={item.id}
              whileTap={unlocked ? { scale: 0.95 } : undefined}
              onClick={() => {
                if (!unlocked) return;
                haptic.selection();
                previewItem(activeCategory, isPreviewed ? null : item.sprite_key);
              }}
              disabled={!unlocked}
              aria-label={`${item.name}, ${item.rarity}${isEquipped ? ', equipped' : ''}${!unlocked ? ', locked' : ''}`}
              className={`relative rounded-xl p-3 border-2 transition-all ${
                isPreviewed
                  ? 'border-telegram-link bg-telegram-link/10 shadow-md'
                  : 'border-transparent bg-telegram-secondaryBg'
              } ${!unlocked ? 'opacity-50' : ''}`}
            >
              {/* Sprite preview placeholder */}
              <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-2">
                <span className="text-2xl">
                  {activeCategory === 'hairstyle' ? '💇' :
                   activeCategory === 'outfit' ? '👕' :
                   activeCategory === 'accessory' ? '🎒' : '🌅'}
                </span>
              </div>

              {/* Item name */}
              <p className="text-xs font-medium text-telegram-text truncate">{item.name}</p>

              {/* Rarity badge */}
              <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${RARITY_COLORS[item.rarity] || 'bg-gray-400'}`}>
                {item.rarity}
              </span>

              {/* Lock overlay */}
              {!unlocked && (
                <div className="absolute inset-0 rounded-xl bg-black/30 flex flex-col items-center justify-center">
                  <Lock className="w-5 h-5 text-white mb-1" />
                  <span className="text-[10px] text-white/80 px-2 text-center">
                    {item.unlock_type === 'level'
                      ? t('avatar.unlockAtLevel', { level: (item.unlock_criteria?.level as number) ?? '?' })
                      : t('avatar.unlockWithAchievement')}
                  </span>
                </div>
              )}

              {/* Equipped indicator */}
              {isEquipped && unlocked && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
          );
        })}

        {categoryItems.length === 0 && (
          <div className="col-span-3 text-center py-8">
            <p className="text-telegram-hint text-sm">{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Save button */}
      {hasChanges && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-20 left-4 right-4 z-10"
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-telegram-link text-white font-bold text-base shadow-xl active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('settings.saving')}
              </>
            ) : (
              t('avatar.save')
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}
