/**
 * PremiumContent page — grid of paid guides, videos, and resources behind Star paywall.
 * Added in Run 95.
 */

import { useState, useEffect, useCallback } from 'react';
import WebApp from '@twa-dev/sdk';
import { Lock, Star, BookOpen, Video, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthHeaders(): Record<string, string> {
  const initData = window.Telegram?.WebApp?.initData;
  return initData
    ? { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData }
    : { 'Content-Type': 'application/json' };
}

interface ContentItem {
  id: number;
  title: string;
  description: string | null;
  content_type: string;
  price_stars: number;
  content_body: string | null;
  media_file_id: string | null;
  has_access: boolean;
  has_preview: boolean;
  created_at: string;
}

const CONTENT_TYPE_ICON: Record<string, React.ReactNode> = {
  guide: <BookOpen size={20} />,
  video: <Video size={20} />,
  resource: <FileText size={20} />,
};

const CONTENT_TYPE_COLOR: Record<string, string> = {
  guide: 'from-emerald-500 to-teal-600',
  video: 'from-purple-500 to-indigo-600',
  resource: 'from-blue-500 to-cyan-600',
};

function ContentSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20" role="status" aria-label="Loading content">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 pt-8 pb-6 px-6 rounded-b-3xl safe-area-top">
        <div className="skeleton h-7 w-48 rounded-lg mb-2" />
        <div className="skeleton h-4 w-64 rounded-lg" />
      </div>
      <div className="px-4 mt-4 space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="flex items-start gap-3">
              <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <div className="skeleton h-4 w-40 rounded-lg mb-2" />
                <div className="skeleton h-3 w-56 rounded-lg mb-3" />
                <div className="skeleton h-8 w-28 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentCard({
  item,
  onPurchase,
  purchasing,
}: {
  item: ContentItem;
  onPurchase: (id: number) => void;
  purchasing: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPurchasing = purchasing === item.id;
  const gradient = CONTENT_TYPE_COLOR[item.content_type] || 'from-gray-500 to-gray-600';

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10 overflow-hidden">
      {/* Card header */}
      <div className={`bg-gradient-to-r ${gradient} p-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
            {CONTENT_TYPE_ICON[item.content_type] || <FileText size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-sm truncate">{item.title}</h3>
              {item.has_access && (
                <span className="flex-shrink-0 bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  Owned
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-white/70 text-xs capitalize">{item.content_type}</span>
            </div>
          </div>
          {!item.has_access && (
            <div className="flex-shrink-0 flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
              <Star size={12} className="text-yellow-300 fill-yellow-300" />
              <span className="text-white text-xs font-bold">{item.price_stars}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {item.description && (
          <p className="text-telegram-hint text-sm mb-3 leading-relaxed">{item.description}</p>
        )}

        {/* Unlocked: show content */}
        {item.has_access && item.content_body ? (
          <div>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1.5 text-telegram-link text-sm font-medium mb-2"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {expanded ? 'Hide content' : 'Read content'}
            </button>
            {expanded && (
              <div className="bg-telegram-bg rounded-xl p-3 text-telegram-text text-sm leading-relaxed whitespace-pre-wrap">
                {item.content_body}
              </div>
            )}
          </div>
        ) : item.has_access ? (
          <p className="text-telegram-hint text-xs italic">Content available — open the app to view.</p>
        ) : (
          /* Locked: purchase button */
          <button
            onClick={() => onPurchase(item.id)}
            disabled={isPurchasing}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {isPurchasing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Lock size={14} />
                Unlock for {item.price_stars} Stars
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function PremiumContent() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/content`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        setItems(json.data as ContentItem[]);
      } else {
        setError(json.error || 'Failed to load content');
      }
    } catch {
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Refresh a single item after purchase to show unlocked content
  const refreshItem = useCallback(async (contentId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/content/${contentId}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        const updated = json.data as ContentItem;
        setItems(prev => prev.map(item => item.id === contentId ? { ...updated, has_preview: item.has_preview } : item));
      }
    } catch { /* noop — non-critical */ }
  }, []);

  const handlePurchase = useCallback(async (contentId: number) => {
    if (purchasing !== null) return;
    setPurchasing(contentId);

    try {
      // Create invoice on backend
      const res = await fetch(`${API_BASE_URL}/content/${contentId}/purchase`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || 'Purchase failed');
      }

      const invoiceUrl: string = json.data.invoice_url;

      // Open Stars invoice via Telegram WebApp
      await new Promise<void>((resolve, reject) => {
        WebApp.openInvoice(invoiceUrl, (status: string) => {
          if (status === 'paid') {
            resolve();
          } else if (status === 'cancelled') {
            reject(new Error('Payment cancelled'));
          } else if (status === 'failed') {
            reject(new Error('Payment failed'));
          } else {
            // pending — treat optimistically
            resolve();
          }
        });
      });

      // Refresh item to show unlocked content
      await refreshItem(contentId);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Purchase failed';
      if (msg !== 'Payment cancelled') {
        WebApp.showAlert(msg);
      }
    } finally {
      setPurchasing(null);
    }
  }, [purchasing, refreshItem]);

  if (loading) return <ContentSkeleton />;

  const ownedCount = items.filter(i => i.has_access).length;

  return (
    <div className="min-h-screen bg-telegram-bg pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 pt-8 pb-6 px-6 rounded-b-3xl safe-area-top">
        <div className="flex items-center gap-3 mb-1">
          <Star size={24} className="text-white" />
          <h1 className="text-white text-xl font-bold">Premium Content</h1>
        </div>
        <p className="text-white/80 text-sm">
          {items.length === 0
            ? 'No content available yet'
            : ownedCount > 0
              ? `${ownedCount} of ${items.length} unlocked`
              : `${items.length} guides & resources`}
        </p>
      </div>

      {/* Content list */}
      <div className="px-4 mt-4 space-y-3">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); fetchContent(); }}
              className="mt-2 text-telegram-link text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {!error && items.length === 0 && (
          <div className="text-center py-12">
            <Star size={40} className="mx-auto text-telegram-hint mb-3" />
            <p className="text-telegram-hint text-sm">No premium content available yet.</p>
            <p className="text-telegram-hint text-xs mt-1">Check back soon!</p>
          </div>
        )}

        {items.map(item => (
          <ContentCard
            key={item.id}
            item={item}
            onPurchase={handlePurchase}
            purchasing={purchasing}
          />
        ))}
      </div>
    </div>
  );
}
