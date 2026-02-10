import { useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 60;

export function usePullToRefresh(onRefresh: () => Promise<void>, haptic?: { impact: (...args: any[]) => void }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const distance = Math.max(0, e.touches[0].clientY - touchStartY.current);
    setPullDistance(Math.min(distance * 0.5, 80));
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      haptic?.impact('medium');
      setRefreshing(true);
      setPullDistance(0);
      await onRefresh();
      setRefreshing(false);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, haptic, onRefresh]);

  return {
    containerRef,
    pullDistance,
    refreshing,
    pullThreshold: PULL_THRESHOLD,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}

export function PullIndicator({ pullDistance, refreshing, pullThreshold }: { pullDistance: number; refreshing: boolean; pullThreshold: number }) {
  return (
    <div
      className={`pull-indicator ${refreshing ? 'active refreshing' : ''}`}
      style={{ height: refreshing ? 48 : pullDistance > 10 ? pullDistance : 0 }}
    >
      <RefreshCw className={`w-5 h-5 text-telegram-hint ${pullDistance >= pullThreshold ? 'text-telegram-link' : ''}`} />
    </div>
  );
}
