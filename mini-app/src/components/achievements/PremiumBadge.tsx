import { ShoppingCart } from 'lucide-react';

interface PremiumBadgeProps {
  isPremium: boolean;
  isPurchased: boolean;
}

export function PremiumBadge({ isPremium, isPurchased }: PremiumBadgeProps) {
  if (!isPremium) return null;

  if (isPurchased) {
    return (
      <>
        {/* Gold shimmer border overlay */}
        <div className="premium-shimmer absolute inset-0 rounded-2xl pointer-events-none z-[1]" />
        {/* Premium tag */}
        <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
          <span>★</span>
          <span>PREMIUM</span>
        </div>
      </>
    );
  }

  // Not purchased yet — show gold lock with Buy label
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
      <ShoppingCart className="w-3 h-3" />
      <span>BUY</span>
    </div>
  );
}
