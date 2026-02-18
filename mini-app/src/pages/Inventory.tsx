import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { useInventory } from '@/hooks/useInventory';
import type { InventoryCategory } from '@/hooks/useInventory';
import type { InventoryItem } from '@/api/inventory';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { ErrorSection } from '@/components/ErrorSection';
import { Toast } from '@/components/Toast';
import { Package, ShoppingBag, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIES: { key: InventoryCategory; icon: React.ReactNode }[] = [
  { key: 'all', icon: <Package className="w-4 h-4" aria-hidden="true" /> },
  { key: 'avatar_item', icon: <Shield className="w-4 h-4" aria-hidden="true" /> },
  { key: 'achievement', icon: <Zap className="w-4 h-4" aria-hidden="true" /> },
  { key: 'trophy_booster', icon: <Zap className="w-4 h-4" aria-hidden="true" /> },
  { key: 'xp_booster', icon: <Zap className="w-4 h-4" aria-hidden="true" /> },
];

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-gray-500',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500',
};

function getCategoryLabel(cat: InventoryCategory, t: (key: string) => string): string {
  switch (cat) {
    case 'all': return t('inventory.cat_all');
    case 'avatar_item': return t('inventory.cat_avatar');
    case 'achievement': return t('inventory.cat_achievement');
    case 'trophy_booster': return t('inventory.cat_booster');
    case 'xp_booster': return t('inventory.cat_xp_booster');
    default: return cat;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const InventoryItemCard = memo(function InventoryItemCard({
  item,
  index,
  equipping,
  onEquipToggle,
}: {
  item: InventoryItem;
  index: number;
  equipping: number | null;
  onEquipToggle: (item: InventoryItem) => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl w-12 h-12 flex items-center justify-center bg-telegram-bg rounded-xl flex-shrink-0" role="img" aria-label={item.name}>
          {item.icon_emoji || '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-telegram-text truncate">{item.name}</span>
            <span className={`${RARITY_COLORS[item.rarity] || 'bg-gray-500'} text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase`}>
              {item.rarity}
            </span>
          </div>
          {item.description && (
            <p className="text-telegram-hint text-xs mb-1.5 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-telegram-hint">
            <span>{formatDate(item.purchased_at)}</span>
            <span>{item.payment_method === 'stars' ? '⭐' : '✨'} {item.amount_paid}</span>
          </div>
        </div>
        {item.type === 'avatar_item' && (
          <button
            onClick={() => onEquipToggle(item)}
            disabled={equipping === item.shop_item_id}
            aria-label={`${item.is_equipped ? 'Unequip' : 'Equip'} ${item.name}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${
              item.is_equipped
                ? 'bg-indigo-500 text-white'
                : 'bg-telegram-bg text-telegram-link border border-telegram-link/30'
            } disabled:opacity-50`}
          >
            {equipping === item.shop_item_id
              ? '...'
              : item.is_equipped
                ? t('inventory.unequip')
                : t('inventory.equip')}
          </button>
        )}
      </div>
    </motion.div>
  );
});

export function Inventory() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();
  const {
    filteredItems,
    totalCount,
    loading,
    error,
    category,
    setCategory,
    equip,
    unequip,
    refresh,
  } = useInventory(user?.id);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [equipping, setEquipping] = useState<number | null>(null);

  // Back button navigates to profile
  useBackButton(useCallback(() => navigate('/profile'), [navigate]));

  // Pull to refresh
  const handleRefresh = useCallback(async () => { await refresh(); }, [refresh]);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  const handleEquipToggle = async (item: InventoryItem) => {
    if (equipping) return;
    setEquipping(item.shop_item_id);
    haptic.impact('medium');
    try {
      if (item.is_equipped) {
        await unequip(item.shop_item_id);
        setToastVariant('success');
        setToastMessage(t('inventory.unequipped', { name: item.name }));
      } else {
        await equip(item.shop_item_id);
        setToastVariant('success');
        setToastMessage(t('inventory.equipped', { name: item.name }));
      }
      haptic.impact('light');
    } catch (err) {
      setToastVariant('error');
      setToastMessage(err instanceof Error ? err.message : t('inventory.equip_failed'));
    } finally {
      setEquipping(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center" role="status" aria-label="Loading inventory">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <Package className="w-10 h-10 text-telegram-hint" aria-hidden="true" />
          <p className="text-telegram-hint text-sm">{t('inventory.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) return <ErrorSection message={t('inventory.couldNotLoad')} onRetry={refresh} />;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 pt-8 pb-6 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <Package className="w-7 h-7 text-white" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-white">{t('inventory.title')}</h1>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-white/90 text-sm font-medium">{t('inventory.total_items')}</span>
            <span className="text-white font-bold">{totalCount}</span>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Inventory categories">
          {CATEGORIES.map(({ key, icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={category === key}
              onClick={() => { haptic.impact('light'); setCategory(key); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                category === key
                  ? 'bg-white text-indigo-700'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              {icon}
              {getCategoryLabel(key, t)}
            </button>
          ))}
        </div>
      </div>

      {/* Item grid */}
      <div className="px-4 mt-4 grid grid-cols-1 gap-3 mb-6">
        {filteredItems.map((item, index) => (
          <InventoryItemCard
            key={item.purchase_id}
            item={item}
            index={index}
            equipping={equipping}
            onEquipToggle={handleEquipToggle}
          />
        ))}

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
            <Package className="w-12 h-12 text-telegram-hint mx-auto mb-3" aria-hidden="true" />
            <p className="text-telegram-hint mb-3">
              {category === 'all'
                ? t('inventory.empty')
                : t('inventory.empty_category')}
            </p>
            <button
              onClick={() => { haptic.impact('light'); navigate('/shop'); }}
              className="inline-flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              {t('inventory.visit_shop')}
            </button>
          </div>
        )}
      </div>

      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  );
}
