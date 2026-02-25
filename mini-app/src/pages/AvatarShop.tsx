import { useState, useCallback, useEffect, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { useTelegram } from '@/hooks/useTelegram.js';
import { getAvatarShopItems, equipAvatarItem, getUserAvatar } from '@/api/avatars.js';
import type { AvatarShopItem, EquippedItems } from '@/api/avatars.js';
import { createShopInvoice } from '@/api/shop.js';
import { ErrorSection } from '@/components/ErrorSection.js';
import { Sparkles, Star, Check, Lock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/utils/logger.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = ['hairstyle', 'outfit', 'accessory', 'background'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  hairstyle: 'Hairstyle',
  outfit: 'Outfit',
  accessory: 'Accessory',
  background: 'Background',
};

const CATEGORY_EMOJI: Record<Category, string> = {
  hairstyle: '💇',
  outfit: '👔',
  accessory: '💍',
  background: '🖼️',
};

const RARITY_GRADIENT: Record<string, string> = {
  common: 'from-gray-400 to-gray-500',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-amber-500',
};

const RARITY_TEXT: Record<string, string> = {
  common: 'text-gray-500',
  uncommon: 'text-green-600',
  rare: 'text-blue-500',
  epic: 'text-purple-600',
  legendary: 'text-amber-500',
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function AvatarShopSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20" role="status" aria-label="Loading avatar shop">
      <div className="bg-gradient-to-br from-violet-500 to-purple-700 pt-8 pb-6 px-6 rounded-b-3xl safe-area-top">
        <div className="skeleton h-8 w-40 rounded-lg mb-2" />
        <div className="skeleton h-4 w-56 rounded-lg" />
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

// ─── Avatar Preview ───────────────────────────────────────────────────────────

function AvatarPreview({
  equipped,
  items,
}: {
  equipped: EquippedItems;
  items: AvatarShopItem[];
}) {
  const getEquippedItem = (category: Category) => {
    const spriteKey = equipped[category];
    return spriteKey ? items.find(i => i.sprite_key === spriteKey) : null;
  };

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 mx-4 mb-4 border border-telegram-hint/10">
      <p className="text-xs font-bold text-telegram-hint uppercase tracking-wider mb-3">Current Avatar</p>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map(cat => {
          const item = getEquippedItem(cat);
          return (
            <div key={cat} className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">{CATEGORY_EMOJI[cat]}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-telegram-hint capitalize">{cat}</p>
                {item ? (
                  <p className={`text-xs font-semibold truncate ${RARITY_TEXT[item.rarity] ?? 'text-telegram-text'}`}>
                    {item.name}
                    {item.is_animated && (
                      <span className="ml-1 text-yellow-500" title="Animated">
                        <Zap className="w-2.5 h-2.5 inline" />
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-telegram-hint italic">None</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  isEquipped,
  onEquip,
  onUnequip,
  onBuy,
  purchasing,
}: {
  item: AvatarShopItem;
  isEquipped: boolean;
  onEquip: (item: AvatarShopItem) => void;
  onUnequip: (item: AvatarShopItem) => void;
  onBuy: (item: AvatarShopItem) => void;
  purchasing: boolean;
}) {
  const gradient = RARITY_GRADIENT[item.rarity] ?? RARITY_GRADIENT.common;
  const isPremium = item.unlock_type === 'premium';
  const canEquip = item.is_owned || !isPremium;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-telegram-secondaryBg rounded-2xl p-4 border flex flex-col items-center relative ${
        isEquipped
          ? 'border-violet-500/60 ring-1 ring-violet-500/30'
          : 'border-telegram-hint/10'
      }`}
    >
      {/* Animated badge */}
      {item.is_animated && (
        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Zap className="w-2.5 h-2.5" />
          ANIM
        </div>
      )}

      {/* Icon */}
      <div
        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-2 relative`}
        aria-hidden="true"
      >
        <span className="text-2xl">{CATEGORY_EMOJI[item.category as Category] ?? '🎭'}</span>
        {isPremium && !item.is_owned && (
          <div className="absolute -bottom-1 -right-1 bg-telegram-bg rounded-full p-0.5">
            <Lock className="w-3 h-3 text-telegram-hint" />
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-bold text-center truncate w-full mb-1">{item.name}</p>

      {/* Rarity badge */}
      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full capitalize bg-gradient-to-r ${gradient} text-white mb-3`}>
        {item.rarity}
      </span>

      {/* Action button */}
      {isEquipped ? (
        <button
          onClick={() => onUnequip(item)}
          className="w-full py-1.5 rounded-xl text-xs font-bold bg-violet-500/20 text-violet-400 flex items-center justify-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          Equipped
        </button>
      ) : canEquip ? (
        <button
          onClick={() => onEquip(item)}
          className="w-full py-1.5 rounded-xl text-xs font-bold bg-telegram-button text-telegram-buttonText"
        >
          Equip
        </button>
      ) : (
        <button
          onClick={() => onBuy(item)}
          disabled={purchasing}
          className="w-full py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-white flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <Star className="w-3.5 h-3.5" />
          {item.price_stars}
        </button>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AvatarShop() {
  const { user, haptic } = useTelegram();
  const [items, setItems] = useState<AvatarShopItem[]>([]);
  const [equipped, setEquipped] = useState<EquippedItems>({
    hairstyle: null,
    outfit: null,
    accessory: null,
    background: null,
  });
  const [activeCategory, setActiveCategory] = useState<Category>('hairstyle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [equippingId, setEquippingId] = useState<number | null>(null);
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [shopItems, equippedItems] = await Promise.all([
        getAvatarShopItems(user.id),
        getUserAvatar(user.id),
      ]);
      if (!mountedRef.current) return;
      setItems(shopItems);
      setEquipped(equippedItems);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load avatar shop';
      setError(msg);
      logger.error('AvatarShop loadData error', { error: err });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  const handleEquip = useCallback(async (item: AvatarShopItem) => {
    if (!user?.id || equippingId !== null) return;
    haptic.impact('light');
    setEquippingId(item.id);
    try {
      const updated = await equipAvatarItem(user.id, item.category, item.id);
      if (!mountedRef.current) return;
      setEquipped(updated);
    } catch (err) {
      logger.error('AvatarShop equip error', { error: err });
    } finally {
      if (mountedRef.current) setEquippingId(null);
    }
  }, [user?.id, equippingId, haptic]);

  const handleUnequip = useCallback(async (item: AvatarShopItem) => {
    if (!user?.id || equippingId !== null) return;
    haptic.impact('light');
    setEquippingId(item.id);
    try {
      const updated = await equipAvatarItem(user.id, item.category, null);
      if (!mountedRef.current) return;
      setEquipped(updated);
    } catch (err) {
      logger.error('AvatarShop unequip error', { error: err });
    } finally {
      if (mountedRef.current) setEquippingId(null);
    }
  }, [user?.id, equippingId, haptic]);

  const handleBuy = useCallback(async (item: AvatarShopItem) => {
    if (!user?.id || !item.shop_item_id) return;
    haptic.impact('medium');
    setPurchasingId(item.id);
    try {
      const invoice = await createShopInvoice(user.id, item.shop_item_id);
      WebApp.openInvoice(invoice.invoice_url, (status: string) => {
        if (status === 'paid') {
          haptic.notification('success');
          loadData(); // Refresh to mark item as owned
        } else if (status === 'cancelled') {
          haptic.notification('warning');
        } else if (status === 'failed') {
          haptic.notification('error');
        }
        if (mountedRef.current) setPurchasingId(null);
      });
    } catch (err) {
      logger.error('AvatarShop buy error', { error: err });
      if (mountedRef.current) setPurchasingId(null);
    }
  }, [user?.id, haptic, loadData]);

  const categoryItems = items.filter(i => i.category === activeCategory);

  if (loading) return <AvatarShopSkeleton />;
  if (error) return <ErrorSection message={error} onRetry={loadData} />;

  return (
    <div className="min-h-screen bg-telegram-bg pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-500 to-purple-700 pt-8 pb-6 px-6 rounded-b-3xl safe-area-top">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="w-7 h-7 text-white" aria-hidden="true" />
          <h1 className="text-2xl font-black text-white">Avatar Shop</h1>
        </div>
        <p className="text-white/70 text-sm">Customize your avatar with premium items</p>
      </div>

      <div className="mt-4">
        {/* Avatar preview */}
        <AvatarPreview equipped={equipped} items={items} />

        {/* Category tabs */}
        <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide" role="tablist">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              onClick={() => { setActiveCategory(cat); haptic.selection(); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeCategory === cat
                  ? 'bg-violet-500 text-white'
                  : 'bg-telegram-secondaryBg text-telegram-hint'
              }`}
            >
              <span aria-hidden="true">{CATEGORY_EMOJI[cat]}</span>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 mb-3">
          <div className="flex items-center gap-1 text-[10px] text-telegram-hint">
            <Star className="w-3 h-3 text-amber-500" />
            <span>Telegram Stars</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-telegram-hint">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span>Animated</span>
          </div>
        </div>

        {/* Items grid */}
        <div className="px-4 grid grid-cols-2 gap-3" role="tabpanel">
          <AnimatePresence mode="popLayout">
            {categoryItems.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-2 text-center text-telegram-hint text-sm py-8"
              >
                No items in this category
              </motion.p>
            ) : (
              categoryItems.map(item => {
                const isEquipped = equipped[item.category as Category] === item.sprite_key;
                return (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isEquipped={isEquipped}
                    onEquip={handleEquip}
                    onUnequip={handleUnequip}
                    onBuy={handleBuy}
                    purchasing={purchasingId === item.id}
                  />
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Premium section hint */}
        {categoryItems.some(i => i.unlock_type === 'premium' && !i.is_owned) && (
          <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 flex-shrink-0" />
              Premium items are purchased once and owned forever
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
