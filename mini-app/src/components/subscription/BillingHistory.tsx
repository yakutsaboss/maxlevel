import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Star, Loader2, ChevronDown } from 'lucide-react';
import { apiClient } from '@/api/client';
import type { PaymentHistoryEntry } from '@/types';

const STATUS_STYLES: Record<PaymentHistoryEntry['status'], string> = {
  completed: 'text-green-500 bg-green-500/10',
  pending: 'text-amber-500 bg-amber-500/10',
  failed: 'text-red-400 bg-red-500/10',
  refunded: 'text-telegram-hint bg-telegram-hint/10',
};

const STATUS_LABELS: Record<PaymentHistoryEntry['status'], string> = {
  completed: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
};

function getDescription(entry: PaymentHistoryEntry): string {
  const meta = entry.metadata as Record<string, unknown>;
  if (meta?.type === 'subscription' || meta?.tier) {
    const tier = (meta.tier as string) ?? 'premium';
    return `${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription`;
  }
  if (meta?.type === 'mode_unlock' || meta?.mode_name) {
    return `Mode unlock: ${(meta.mode_name as string) ?? 'Mode'}`;
  }
  if (meta?.type === 'shop_item' || meta?.item_name) {
    return `Shop item: ${(meta.item_name as string) ?? 'Item'}`;
  }
  return 'Transaction';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

interface BillingHistoryProps {
  userId: number;
}

export function BillingHistory({ userId }: BillingHistoryProps) {
  const [entries, setEntries] = useState<PaymentHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (pageNum: number, append = false) => {
    try {
      const res = await apiClient.getBillingHistory(userId, pageNum);
      if (res.success && res.data) {
        setEntries(prev => append ? [...prev, ...res.data!.entries] : res.data!.entries);
        setTotal(res.data.total);
      }
    } catch {
      if (!append) setError('Failed to load billing history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    await loadPage(nextPage, true);
  };

  const hasMore = entries.length < total;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-telegram-hint">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-telegram-hint text-sm">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-12 h-12 rounded-full bg-telegram-hint/10 flex items-center justify-center">
          <Receipt className="w-6 h-6 text-telegram-hint" />
        </div>
        <p className="text-sm text-telegram-hint">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center justify-between bg-telegram-bg rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{getDescription(entry)}</p>
              <p className="text-xs text-telegram-hint">{formatDate(entry.created_at)}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
            <span className="text-sm font-semibold">{entry.amount} ★</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLES[entry.status]}`}>
              {STATUS_LABELS[entry.status]}
            </span>
          </div>
        </motion.div>
      ))}

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-telegram-link disabled:opacity-50"
        >
          {loadingMore ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          {loadingMore ? 'Loading...' : `Load more (${total - entries.length} remaining)`}
        </button>
      )}
    </div>
  );
}
