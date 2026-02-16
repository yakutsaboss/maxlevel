// Stub for Agent D's branch — will be replaced by Agent B's real implementation during merge
// This allows the build to pass independently before merge

export interface EquippedItems {
  background?: number | null;
  body?: number | null;
  eyes?: number | null;
  mouth?: number | null;
  hair?: number | null;
  outfit?: number | null;
  accessory?: number | null;
}

interface AvatarRendererProps {
  equipped: EquippedItems;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-24 h-24',
};

export function AvatarRenderer({ size = 'md', onClick, className = '' }: AvatarRendererProps) {
  return (
    <div
      className={`${SIZE_MAP[size]} rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <span className="text-white text-xs">PX</span>
    </div>
  );
}
