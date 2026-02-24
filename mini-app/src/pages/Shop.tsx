import { useState, useCallback, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '@/hooks/useTelegram.js';
import { useShop } from '@/hooks/useShop.js';
import type { ShopCategory } from '@/hooks/useShop.js';
import { usePurchase } from '@/hooks/usePurchase.js';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh.js';
import { useStaggerAnimation } from '@/hooks/useStaggerAnimation.js';
import { PurchaseModal } from '@/components/shop/PurchaseModal.js';
import { ErrorSection } from '@/components/ErrorSection.js';
import { ShoppingBag, Search, Star, Sparkles, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ShopItem } from '@/api/shop.js';

const RARITY_GRADIENT: Record<string, string> = {
  common: 'from-gray-400 to-gray-500',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-amber-500',
};

const CATEGORIES: { key: ShopCategory; label: string }[] = [
  { key: 'all', label: 'shop.cat_all' },
  { key: 'achievement', label: 'shop.cat_achievements' },
  { key: 'avatar_item', label: 'shop.cat_avatarItems' },
  { key: 'trophy_booster', label: 'shop.cat_boosters' },
  { key: 'xp_booster', label: 'shop.cat_boosters_xp' },
];

function ShopSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20" role="status" aria-label="Loading shop">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 pt-8 pb-6 px-6 rounded-b-3xl safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <div className="skeleton w-7 h-7 rounded-lg" />
          <div className="skeleton h-7 w-28 rounded-lg" />
        </div>
        <div className="flex gap-3 mt-4">
          <div className="skeleton h-10 flex-1 rounded-xl" />
          <div className="skeleton h-10 flex-1 rounded-xl" />
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-8 w-24 rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="skeleton w-14 h-14 rounded-xl mx-auto mb-3" />
            <div className="skeleton h-3 w-20 rounded-lg mx-auto mb-2" />
            <div className="skeleton h-3 w-14 rounded-full mx-auto mb-2" />
            <div className="skeleton h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

const FeaturedCarousel = memo(function FeaturedCarousel({
  items,
  ownedItemIds,
  onItemTap,
}: {
  items: ShopItem[];
  ownedItemIds: Set<number>;
  onItemTap: (item: ShopItem) => void;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <h2 className="text-white/90 text-sm font-medium mb-2 px-1">
        {t('shop.featured')}
      </h2>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
      >
        {items.map((item) => {
          const gradient = RARITY_GRADIENT[item.rarity] ?? RARITY_GRADIENT.common;
          const owned = ownedItemIds.has(item.id);
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => onItemTap(item)}
              aria-label={`${item.name} — ${owned ? t('shop.owned') : item.price_stars > 0 ? `${item.price_stars} stars` : `${item.price_xp} XP`}`}
              className={`flex-shrink-0 w-40 snap-start rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} p-3 text-left`}
            >
              <span className="text-4xl block mb-2" role="img" aria-hidden="true">{item.icon_emoji || '🛍️'}</span>
              <p className="text-white font-bold text-sm truncate">{item.name}</p>
              <p className="text-white/70 text-xs truncate">{item.description}</p>
              <div className="mt-2 flex items-center gap-1">
                {owned ? (
                  <span className="flex items-center gap-1 text-white/90 text-xs font-medium bg-white/20 rounded-lg px-2 py-0.5">
                    <Check className="w-3 h-3" aria-hidden="true" />
                    {t('shop.owned')}
                  </span>
                ) : (
                  <>
                    {item.price_stars > 0 && (
                      <span className="flex items-center gap-0.5 text-white/90 text-xs font-bold bg-white/20 rounded-lg px-2 py-0.5">
                        <Star className="w-3 h-3" aria-hidden="true" />
                        {item.price_stars}
                      </span>
                    )}
                    {item.price_xp > 0 && (
                      <span className="flex items-center gap-0.5 text-white/90 text-xs font-bold bg-white/20 rounded-lg px-2 py-0.5">
                        <Sparkles className="w-3 h-3" aria-hidden="true" />
                        {item.price_xp}
                      </span>
                    )}
                  </>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

const itemCardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
};

const ItemCard = memo(function ItemCard({
  item,
  owned,
  onTap,
}: {
  item: ShopItem;
  owned: boolean;
  onTap: (item: ShopItem) => void;
}) {
  const { t } = useTranslation();
  const gradient = RARITY_GRADIENT[item.rarity] ?? RARITY_GRADIENT.common;

  return (
    <motion.button
      variants={itemCardVariants}
      whileTap={{ scale: 0.97 }}
      onClick={() => onTap(item)}
      aria-label={`${item.name}, ${item.rarity}${owned ? `, ${t('shop.owned')}` : ''}`}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 text-left flex flex-col items-center"
    >
      {/* Icon */}
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-2`} aria-hidden="true">
        <span className="text-2xl">{item.icon_emoji || '🛍️'}</span>
      </div>

      {/* Name */}
      <p className="text-sm font-bold text-center truncate w-full">{item.name}</p>

      {/* Rarity badge */}
      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize mt-1 bg-gradient-to-r ${gradient} text-white`}>
        {t(`shop.rarity_${item.rarity}`)}
      </span>

      {/* Price / Owned */}
      <div className="mt-2 w-full">
        {owned ? (
          <div className="flex items-center justify-center gap-1 bg-green-500/10 text-green-600 rounded-lg py-1.5 text-xs font-bold">
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            {t('shop.owned')}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            {item.price_stars > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-600">
                <Star className="w-3.5 h-3.5" aria-hidden="true" />
                {item.price_stars}
              </span>
            )}
            {item.price_xp > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-bold text-blue-500">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                {item.price_xp}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
});

export function Shop() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();

  const {
    filteredItems,
    featuredItems,
    ownedItemIds,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    refresh,
  } = useShop(user?.id);

  const [showSearch, setShowSearch] = useState(false);

  const handlePurchaseSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  const {
    purchaseState,
    currentItem,
    errorMessage,
    startPurchase,
    confirmPurchase,
    dismissResult,
    cancelPurchase,
  } = usePurchase({
    userId: user?.id,
    telegramId: user?.id,
    onSuccess: handlePurchaseSuccess,
  });

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } =
    usePullToRefresh(handleRefresh, haptic);

  const { containerVariants: gridVariants } = useStaggerAnimation(filteredItems.length, 0.03);

  const handleItemTap = useCallback(
    (item: ShopItem) => {
      haptic.impact('light');
      if (ownedItemIds.has(item.id) && item.type === 'achievement') {
        return;
      }
      startPurchase(item);
    },
    [haptic, ownedItemIds, startPurchase],
  );

  const handleCloseModal = useCallback(() => {
    if (purchaseState === 'success') {
      dismissResult();
    } else {
      cancelPurchase();
    }
  }, [purchaseState, dismissResult, cancelPurchase]);

  if (loading) return <ShopSkeleton />;
  if (error) return <ErrorSection message={error} onRetry={refresh} />;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator
        pullDistance={pullDistance}
        refreshing={refreshing}
        pullThreshold={pullThreshold}
      />

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 pt-8 pb-6 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-white" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-white">{t('shop.title')}</h1>
          </div>
          <button
            onClick={() => {
              haptic.impact('light');
              setShowSearch((v) => !v);
            }}
            className="p-2 rounded-full bg-white/20 active:bg-white/30 transition-colors"
            aria-label="Toggle search"
          >
            <Search className="w-5 h-5 text-white" aria-hidden="true" />
          </button>
        </div>

        {/* Search bar (toggle) */}
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden mt-3"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('shop.searchPlaceholder')}
              aria-label="Search shop items"
              className="w-full px-4 py-2.5 rounded-xl bg-white/20 text-white placeholder-white/50 text-sm outline-none focus:bg-white/30 transition-colors"
              autoFocus
            />
          </motion.div>
        )}

        {/* Featured carousel */}
        <FeaturedCarousel
          items={featuredItems}
          ownedItemIds={ownedItemIds}
          onItemTap={handleItemTap}
        />

        {/* Category tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1" role="tablist" aria-label="Shop categories">
          {CATEGORIES.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={category === key}
              onClick={() => {
                haptic.impact('light');
                setCategory(key);
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                category === key
                  ? 'bg-white text-purple-700'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </div>

      {/* Item grid */}
      <motion.div
        className="px-4 mt-4 grid grid-cols-2 gap-3 mb-6"
        variants={gridVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            owned={ownedItemIds.has(item.id)}
            onTap={handleItemTap}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
            <ShoppingBag className="w-12 h-12 text-telegram-hint mx-auto mb-3" aria-hidden="true" />
            <p className="text-telegram-hint">
              {searchQuery.trim()
                ? t('shop.noResults')
                : t('shop.empty')}
            </p>
          </div>
        )}
      </motion.div>

      {/* Purchase modal */}
      <PurchaseModal
        item={currentItem}
        purchaseState={purchaseState}
        errorMessage={errorMessage}
        onConfirm={confirmPurchase}
        onClose={handleCloseModal}
      />
    </div>
  );
}
